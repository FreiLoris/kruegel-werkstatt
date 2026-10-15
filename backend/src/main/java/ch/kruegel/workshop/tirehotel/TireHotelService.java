package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The tyre hotel (FB-07): store, edit, measure again, retrieve – and its tread limits.
 * Every input is checked before anything is changed.
 */
@Service
@Transactional
public class TireHotelService {

    static final String TOPIC = "tire-sets";
    static final String SETTINGS_TOPIC = "tire-hotel-settings";

    private final TireSetRepository repository;
    private final TireHotelSettingsRepository settings;
    private final TirePlaceRepository places;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TireHotelService(TireSetRepository repository, TireHotelSettingsRepository settings, TirePlaceRepository places,
                     CustomerRepository customers, VehicleRepository vehicles, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.settings = settings;
        this.places = places;
        this.customers = customers;
        this.vehicles = vehicles;
        this.events = events;
        this.clock = clock;
    }

    /** In the hotel (newest first) or the retrieved ones (last retrieved first). Searched in the browser – a few hundred sets. */
    @Transactional(readOnly = true)
    public List<TireSetDto> list(boolean inHotel) {
        return (inHotel ? repository.inHotel() : repository.retrieved()).stream().map(TireSetDto::of).toList();
    }

    @Transactional(readOnly = true)
    public TireSetDto get(UUID id) {
        return TireSetDto.of(find(id));
    }

    /** Oldest first. */
    @Transactional(readOnly = true)
    public List<TireSetEventDto> history(UUID id) {
        return find(id).getEvents().stream().map(TireSetEventDto::of).toList();
    }

    public TireSetDto store(TireSetRequest request) {
        TireSetDetails details = details(request, null);
        LocalDate today = LocalDate.now(clock);
        LocalDate day = request.storedOn() == null ? today : request.storedOn();
        // User-facing messages, hence German
        if (day.isAfter(today)) {
            throw new InvalidInputException("storedOn", "darf nicht in der Zukunft liegen");
        }
        TirePlace place = request.placeId() == null ? null : freePlace(request.placeId(), null);
        TireSet set = new TireSet(details, DepthsRequest.toDepths(request.depths()), day, place, null);
        return saved(repository.save(set));
    }

    /** Onto another place – or its first one (e.g. a set taken over from SwissGarage). */
    public TireSetDto move(UUID id, MoveRequest request) {
        TireSet set = find(id);
        if (!set.isInHotel()) {
            throw new BusinessRuleException("Dieser Satz ist ausgelagert – er hat keinen Platz.");
        }
        if (set.getPlace() != null && set.getPlace().getId().equals(request.placeId())) {
            throw new InvalidInputException("placeId", "Der Satz liegt schon dort");
        }
        TirePlace place = freePlace(request.placeId(), set);
        set.moveTo(place, day(request.on(), set, "on"), request.note());
        return saved(set);
    }

    /**
     * A place in use and free – else it says who lies there. Two devices taking the same place in the
     * same second: the unique index of V33 refuses the second.
     *
     * @param moving the set being moved; empty when storing
     */
    private TirePlace freePlace(UUID placeId, TireSet moving) {
        TirePlace place = places.findById(placeId).orElseThrow(() -> new InvalidInputException("placeId", "Platz gibt es nicht"));
        if (!place.isActive()) {
            throw new InvalidInputException("placeId", place.getAddress() + " wird nicht mehr verwendet");
        }
        repository.onPlace(placeId).filter(other -> !other.equals(moving)).ifPresent(other -> {
            throw new InvalidInputException("placeId", "%s ist belegt (%s)".formatted(place.getAddress(),
                    other.getCustomer().getDetails().displayName()));
        });
        return place;
    }

    /** The data of the set – its depths change by {@link #measure}, so they are in the history. */
    public TireSetDto update(UUID id, TireSetRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        TireSet set = find(id);
        set.checkVersion(request.version());
        // the place changes by moving – it goes into the history
        UUID current = set.getPlace() == null ? null : set.getPlace().getId();
        if (request.placeId() != null && !request.placeId().equals(current)) {
            throw new InvalidInputException("placeId", "Den Platz über «Umlagern» ändern");
        }
        set.update(details(request, set));
        return saved(set);
    }

    public TireSetDto measure(UUID id, MeasurementRequest request) {
        TireSet set = find(id);
        LocalDate day = day(request.on(), set, "on");
        set.measure(request.depths().toDepths(), day, request.note());
        return saved(set);
    }

    public TireSetDto retrieve(UUID id, RetrieveRequest request) {
        TireSet set = find(id);
        if (!set.isInHotel()) {
            throw new BusinessRuleException("Dieser Satz ist bereits ausgelagert.");
        }
        set.retrieve(day(request.on(), set, "on"), request.note());
        return saved(set);
    }

    @Transactional(readOnly = true)
    public TireHotelSettingsDto settings() {
        return TireHotelSettingsDto.of(theSettings());
    }

    public TireHotelSettingsDto updateSettings(TireHotelSettingsRequest request) {
        TireHotelSettings current = theSettings();
        current.checkVersion(request.version());
        if (request.minimumMm().compareTo(request.summerMm()) > 0 || request.minimumMm().compareTo(request.winterMm()) > 0) {
            throw new InvalidInputException("minimumMm", "darf nicht über den Grenzen für Sommer und Winter liegen");
        }
        current.update(request.summerMm(), request.winterMm(), request.minimumMm());
        settings.flush();
        events.publishEvent(new DataChanged(SETTINGS_TOPIC));
        return TireHotelSettingsDto.of(current);
    }

    private TireHotelSettings theSettings() {
        return settings.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Tyre hotel settings missing – migration V32 creates them"));
    }

    /** A day of a measurement or retrieval: not in the future, not before the set was stored. */
    private LocalDate day(LocalDate wanted, TireSet set, String field) {
        LocalDate today = LocalDate.now(clock);
        LocalDate day = wanted == null ? today : wanted;
        if (day.isAfter(today)) {
            throw new InvalidInputException(field, "darf nicht in der Zukunft liegen");
        }
        if (day.isBefore(set.getStoredOn())) {
            throw new InvalidInputException(field, "liegt vor der Einlagerung");
        }
        return day;
    }

    /** Customer and vehicle: a newly chosen one must be active; the one of the set stays valid. */
    private TireSetDetails details(TireSetRequest request, TireSet current) {
        if (request.kind() != TireSetKind.WHEELS && request.rims() != null) {
            throw new InvalidInputException("rims", "nur bei Kompletträdern");
        }
        Customer customer = current != null && request.customerId().equals(current.getCustomer().getId())
                ? current.getCustomer()
                : customers.findById(request.customerId())
                        .filter(Customer::isActive)
                        .orElseThrow(() -> new InvalidInputException("customerId", "Kunde gibt es nicht oder ist nicht mehr aktiv"));
        Vehicle vehicle = null;
        if (request.vehicleId() != null) {
            vehicle = current != null && current.getVehicle() != null && request.vehicleId().equals(current.getVehicle().getId())
                    ? current.getVehicle()
                    : vehicles.findById(request.vehicleId())
                            .filter(Vehicle::isActive)
                            .orElseThrow(() -> new InvalidInputException("vehicleId", "Fahrzeug gibt es nicht oder ist nicht mehr aktiv"));
        }
        return new TireSetDetails(customer, vehicle, request.season(), request.kind(), request.rims(), request.hubCaps(),
                request.wheelBolts(), request.brand(), request.model(), request.dimension(), request.year(), request.remark());
    }

    private TireSet find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Reifensatz", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private TireSetDto saved(TireSet set) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return TireSetDto.of(set);
    }
}
