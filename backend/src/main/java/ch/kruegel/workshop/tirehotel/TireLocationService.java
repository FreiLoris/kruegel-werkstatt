package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The locations of the tyre hotel and their places (FB-07): set up in the settings; the places are
 * generated from the sizes. Made smaller, the places beyond are no longer used – only if they are
 * empty. A location is deleted only while none of its places holds a set.
 */
@Service
@Transactional
public class TireLocationService {

    static final String TOPIC = "tire-locations";
    /** More would make the place view unusable (and slow) – a real location has a few dozen */
    static final int MAX_PLACES = 500;

    private final TireLocationRepository locations;
    private final TirePlaceRepository places;
    private final TireSetRepository sets;
    private final ApplicationEventPublisher events;

    TireLocationService(TireLocationRepository locations, TirePlaceRepository places, TireSetRepository sets,
                        ApplicationEventPublisher events) {
        this.locations = locations;
        this.places = places;
        this.sets = sets;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<TireLocationDto> list() {
        return locations.findAllInOrder().stream().map(TireLocationDto::of).toList();
    }

    /** All places of all locations, in order – also the no longer used ones (the history may name them). */
    @Transactional(readOnly = true)
    public List<TirePlaceDto> places() {
        return places.findAllInOrder().stream().map(TirePlaceDto::of).toList();
    }

    public TireLocationDto create(TireLocationRequest request) {
        checkSize(request);
        String code = code(request);
        if (locations.existsByCode(code)) {
            throw codeTaken(code);
        }
        TireLocation location = locations.save(new TireLocation(code, request.name(), request.kind(), request.sizeA(), request.sizeB(),
                request.sizeC(), locations.maxSortOrder() + 1));
        generatePlaces(location, Map.of());
        return saved(location);
    }

    /** New code, name or sizes – the places follow (their addresses, new ones, no longer used ones). */
    public TireLocationDto update(UUID id, TireLocationRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        TireLocation location = find(id);
        location.checkVersion(request.version());
        checkSize(request);
        String code = code(request);
        // check first, then change (Hibernate "auto flush", see LiftService#rename)
        if (locations.existsByCodeAndIdNot(code, id)) {
            throw codeTaken(code);
        }
        // a set must not lose its place by making the location smaller
        sets.atLocation(id).stream()
                .filter(s -> !fits(s.getPlace(), request))
                .findFirst()
                .ifPresent(s -> {
                    throw new InvalidInputException("sizeA", "%s ist belegt (%s) – zuerst umlagern".formatted(s.getPlace().getAddress(),
                            s.getCustomer().getDetails().displayName()));
                });
        boolean newCode = !code.equals(location.getCode());
        location.update(code, request.name(), request.sizeA(), request.sizeB(), request.sizeC());
        Map<String, TirePlace> existing = places.findByLocationId(id).stream()
                .collect(Collectors.toMap(p -> key(p.getA(), p.getB(), p.getC()), p -> p));
        // the existing ones: address from the (maybe new) code, in use while within the sizes
        existing.values().forEach(TirePlace::refresh);
        generatePlaces(location, existing);
        TireLocationDto saved = saved(location);
        if (newCode) {
            // every address of the location changed – the tyre hotel list shows them
            events.publishEvent(new DataChanged(TireHotelService.TOPIC));
        }
        return saved;
    }

    /** Only while no set lies at the location – the history keeps the addresses as text. */
    public void delete(UUID id) {
        TireLocation location = find(id);
        if (!sets.atLocation(id).isEmpty()) {
            throw new BusinessRuleException(location.getName() + " hat noch eingelagerte Sätze – zuerst umlagern.");
        }
        // its places go with it (ON DELETE CASCADE); retrieved sets no longer name one (V33)
        locations.delete(location);
        locations.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }

    /** Every place within the sizes – created where missing (the existing ones were refreshed), in one batch. */
    private void generatePlaces(TireLocation location, Map<String, TirePlace> existing) {
        List<TirePlace> missing = new ArrayList<>();
        for (int a = 1; a <= location.getSizeA(); a++) {
            for (int b = 1; b <= location.getSizeB(); b++) {
                for (int c = 1; c <= location.getSizeC(); c++) {
                    if (!existing.containsKey(key(a, b, c))) {
                        missing.add(new TirePlace(location, a, b, c));
                    }
                }
            }
        }
        places.saveAll(missing);
    }

    /** User-facing message, hence German */
    private static void checkSize(TireLocationRequest request) {
        if (request.sizeA() * request.sizeB() * request.sizeC() > MAX_PLACES) {
            throw new InvalidInputException("sizeC", "Höchstens " + MAX_PLACES + " Plätze pro Standort – lieber einen zweiten Standort anlegen");
        }
    }

    private static boolean fits(TirePlace place, TireLocationRequest request) {
        return place.getA() <= request.sizeA() && place.getB() <= request.sizeB() && place.getC() <= request.sizeC();
    }

    private static String key(int a, int b, int c) {
        return a + "/" + b + "/" + c;
    }

    private static String code(TireLocationRequest request) {
        return request.code().strip().toUpperCase();
    }

    private TireLocation find(UUID id) {
        return locations.findById(id).orElseThrow(() -> new NotFoundException("Standort", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private TireLocationDto saved(TireLocation location) {
        locations.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return TireLocationDto.of(location);
    }

    private static InvalidInputException codeTaken(String code) {
        return new InvalidInputException("code", "'" + code + "' gibt es bereits");
    }
}
