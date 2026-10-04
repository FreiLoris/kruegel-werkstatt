package ch.kruegel.workshop.courtesycar;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Administration of the courtesy cars. Same structure as {@code EmployeeService}. */
@Service
@Transactional
public class CourtesyCarService {

    static final String TOPIC = "courtesy-cars";

    private final CourtesyCarRepository repository;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    CourtesyCarService(CourtesyCarRepository repository, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CourtesyCarDto> list(boolean includeInactive) {
        List<CourtesyCar> cars = includeInactive
                ? repository.findAllByOrderBySortOrderAscNameAsc()
                : repository.findByActiveTrueOrderBySortOrderAscNameAsc();
        LocalDate today = LocalDate.now(clock);
        return cars.stream().map(car -> CourtesyCarDto.of(car, today)).toList();
    }

    public CourtesyCarDto create(CourtesyCarRequest request) {
        CourtesyCarDetails details = request.toDetails();
        checkUnique(details, null);
        return saved(repository.save(new CourtesyCar(details, repository.nextSortOrder())));
    }

    public CourtesyCarDto update(UUID id, CourtesyCarRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        CourtesyCar car = find(id);
        car.checkVersion(request.version());

        // Check first, then change – see "Check before change" in docs/conventions.md
        CourtesyCarDetails details = request.toDetails();
        if (car.isActive()) {
            checkUnique(details, id);
        }
        car.update(details);
        return saved(car);
    }

    /** Sold or returned: no longer bookable, but kept for old bookings. */
    public CourtesyCarDto deactivate(UUID id) {
        CourtesyCar car = find(id);
        car.deactivate();
        return saved(car);
    }

    public CourtesyCarDto activate(UUID id) {
        CourtesyCar car = find(id);
        if (!car.isActive()) {
            checkUnique(car.getDetails(), id);
        }
        car.activate();
        return saved(car);
    }

    /** First ID = first card on the courtesy car page. */
    public List<CourtesyCarDto> reorder(List<UUID> ids) {
        SortOrder.reorder(repository.findAllByOrderBySortOrderAscNameAsc(), ids, "Ersatzwagen");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    /** Name and license plate are unique among the active cars ({@code ownId}: ignore the car itself). */
    private void checkUnique(CourtesyCarDetails details, UUID ownId) {
        boolean nameTaken = ownId == null
                ? repository.existsByActiveTrueAndNameIgnoreCase(details.name())
                : repository.existsByActiveTrueAndNameIgnoreCaseAndIdNot(details.name(), ownId);
        if (nameTaken) {
            throw new InvalidInputException("name", "'" + details.name() + "' gibt es bereits");
        }
        String plate = details.licensePlate();
        if (plate == null) {
            return;
        }
        boolean plateTaken = ownId == null
                ? repository.existsByActiveTrueAndLicensePlate(plate)
                : repository.existsByActiveTrueAndLicensePlateAndIdNot(plate, ownId);
        if (plateTaken) {
            throw new InvalidInputException("licensePlate", "'" + plate + "' gehört bereits zu einem anderen Ersatzwagen");
        }
    }

    private CourtesyCar find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Ersatzwagen", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private CourtesyCarDto saved(CourtesyCar car) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return CourtesyCarDto.of(car, LocalDate.now(clock));
    }
}
