package ch.kruegel.workshop.lift;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Administration of lifts. Same structure as {@code EmployeeService}. */
@Service
@Transactional
public class LiftService {

    static final String TOPIC = "lifts";

    private final LiftRepository repository;
    private final ApplicationEventPublisher events;

    LiftService(LiftRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<LiftDto> list(boolean includeInactive) {
        List<Lift> lifts = includeInactive
                ? repository.findAllByOrderBySortOrderAscNameAsc()
                : repository.findByActiveTrueOrderBySortOrderAscNameAsc();
        return lifts.stream().map(LiftDto::of).toList();
    }

    public LiftDto create(LiftRequest request) {
        Lift lift = new Lift(request.name(), repository.nextSortOrder());
        if (repository.existsByActiveTrueAndNameIgnoreCase(lift.getName())) {
            throw nameTaken(lift.getName());
        }
        return saved(repository.save(lift));
    }

    public LiftDto rename(UUID id, LiftRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Lift lift = find(id);
        lift.checkVersion(request.version());
        // Check first, then change: the check query would otherwise write the already changed
        // entity to the database first (Hibernate "auto flush") – and the unique index kicks in.
        String name = request.name().strip();
        if (lift.isActive() && repository.existsByActiveTrueAndNameIgnoreCaseAndIdNot(name, id)) {
            throw nameTaken(name);
        }
        lift.rename(name);
        return saved(lift);
    }

    /**
     * Decommission a lift: no column anymore, no longer selectable.
     * The last active lift stays – without a lift no appointment could be scheduled.
     */
    public LiftDto deactivate(UUID id) {
        Lift lift = find(id);
        if (lift.isActive() && repository.countByActiveTrue() <= 1) {
            throw new BusinessRuleException("Mindestens ein Lift muss in Betrieb bleiben.");
        }
        lift.deactivate();
        return saved(lift);
    }

    public LiftDto activate(UUID id) {
        Lift lift = find(id);
        if (!lift.isActive() && repository.existsByActiveTrueAndNameIgnoreCase(lift.getName())) {
            throw nameTaken(lift.getName());
        }
        lift.activate();
        return saved(lift);
    }

    /** First ID = leftmost column. IDs not listed follow in their previous order. */
    public List<LiftDto> reorder(List<UUID> ids) {
        SortOrder.reorder(repository.findAllByOrderBySortOrderAscNameAsc(), ids, "Lift");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    private Lift find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Lift", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private LiftDto saved(Lift lift) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return LiftDto.of(lift);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
