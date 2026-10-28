package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The tyre change of a task (FB-06/FB-07, 13q, FB-12): the sheet prints the set to mount and its
 * place; once the wheels are changed, both sets are booked in one step with the depths noted on the
 * sheet – the one put on from the hotel, brought by the customer or new, the one taken off into the
 * hotel or home with the customer. Tyres not stored are kept too, so the next call knows them. The
 * history keeps the task.
 */
@Service
@Transactional
public class TaskTireService {

    /** What putting a set on the car leaves in its history */
    static final Set<TireSetEventKind> MOUNTING = Set.of(TireSetEventKind.RETRIEVED, TireSetEventKind.MOUNTED);
    /** What taking a set off leaves in its history */
    static final Set<TireSetEventKind> REMOVING = Set.of(TireSetEventKind.STORED, TireSetEventKind.TAKEN_HOME, TireSetEventKind.DISPOSED);

    private final TireSetRepository repository;
    private final TireHotelService hotel;
    private final TaskRepository tasks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TaskTireService(TireSetRepository repository, TireHotelService hotel, TaskRepository tasks, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.hotel = hotel;
        this.tasks = tasks;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public TaskTiresDto of(UUID taskId) {
        return dto(findTask(taskId));
    }

    public TaskTiresDto book(UUID taskId, TaskTireBookingRequest request) {
        Task task = findTask(taskId);
        // User-facing messages, hence German
        if (!task.getWork().tireChange()) {
            throw new BusinessRuleException("Dieser Auftrag hat keinen Radwechsel.");
        }
        if (request.mounted() == null && request.removed() == null) {
            throw new InvalidInputException("mounted", "Montierte oder abmontierte Räder angeben");
        }
        List<TireSet> candidates = candidates(task);
        LocalDate today = LocalDate.now(clock);
        String note = task.getTaskNumber() == null ? "Radwechsel im Auftrag" : "Radwechsel, Auftrag " + task.getTaskNumber();

        // every check before the first change
        TaskTireBookingRequest.MountedSet m = request.mounted();
        TireSet mounted = m == null ? null : mountedSet(task, m, candidates);
        TaskTireBookingRequest.RemovedSet r = request.removed();
        TireSet removed = null;
        TirePlace place = null;
        if (r != null) {
            if (repository.bookedBy(task.getId(), REMOVING).isPresent()) {
                throw new BusinessRuleException("Die abmontierten Räder dieses Auftrags sind schon gebucht.");
            }
            checkOneOf(r.setId(), r.newSet(), "removed");
            removed = r.setId() == null ? null : removedSet(task, r, mounted, candidates);
            if (!r.store() && r.placeId() != null) {
                throw new InvalidInputException("removed.placeId", "Nur beim Einlagern");
            }
            // the place of the set mounted is free once it is retrieved – the wheels simply swap places
            place = r.store() && r.placeId() != null ? hotel.freePlace(r.placeId(), mounted) : null;
        }

        if (m != null) {
            TreadDepths depths = DepthsRequest.toDepths(m.depths());
            if (mounted == null) {
                repository.save(TireSet.recorded(details(task, m.newSet(), "mounted"), depths, today, TireSetState.MOUNTED, note, task));
            } else {
                if (depths.lowest() != null) {
                    mounted.measure(depths, today, note, task);
                }
                // from the hotel its place is free now – the removed set may go there
                if (mounted.isInHotel()) {
                    mounted.retrieve(today, note, task);
                } else {
                    mounted.mount(today, note, task);
                }
            }
            repository.flush();
        }
        if (r != null) {
            TreadDepths depths = DepthsRequest.toDepths(r.depths());
            if (removed == null) {
                TireSetDetails details = details(task, r.newSet(), "removed");
                repository.save(r.store() ? new TireSet(details, depths, today, place, note, task)
                        : TireSet.recorded(details, depths, today, r.dispose() ? TireSetState.DISPOSED : TireSetState.WITH_CUSTOMER, note, task));
            } else if (r.store()) {
                removed.storeAgain(depths, today, place, note, task);
            } else {
                if (depths.lowest() != null) {
                    removed.measure(depths, today, note, task);
                }
                if (r.dispose()) {
                    removed.dispose(today, note, task);
                } else {
                    removed.takeHome(today, note, task);
                }
            }
        }
        repository.flush();
        events.publishEvent(new DataChanged(TireHotelService.TOPIC));
        return dto(task);
    }

    /** A set of the vehicle in the hotel or with the customer – or none: a new one is recorded */
    private TireSet mountedSet(Task task, TaskTireBookingRequest.MountedSet m, List<TireSet> candidates) {
        if (repository.bookedBy(task.getId(), MOUNTING).isPresent()) {
            throw new BusinessRuleException("Die montierten Räder dieses Auftrags sind schon gebucht.");
        }
        checkOneOf(m.setId(), m.newSet(), "mounted");
        if (m.setId() == null) {
            return null;
        }
        TireSet set = candidates.stream().filter(s -> s.getId().equals(m.setId())).findFirst()
                .orElseThrow(() -> new InvalidInputException("mounted.setId", "Satz gehört nicht zu Kunde/Fahrzeug des Auftrags"));
        if (set.getState() == TireSetState.MOUNTED) {
            throw new InvalidInputException("mounted.setId", "Satz ist schon montiert");
        }
        return set;
    }

    /** A set of the vehicle not in the hotel: stored again, or taken home when it is on the car */
    private TireSet removedSet(Task task, TaskTireBookingRequest.RemovedSet r, TireSet mounted, List<TireSet> candidates) {
        boolean justMounted = mounted != null && mounted.getId().equals(r.setId())
                || repository.bookedBy(task.getId(), MOUNTING).map(s -> s.getId().equals(r.setId())).orElse(false);
        if (justMounted) {
            throw new InvalidInputException("removed.setId", "Derselbe Satz kann nicht montiert und abmontiert werden");
        }
        TireSet set = candidates.stream().filter(s -> s.getId().equals(r.setId())).findFirst()
                .orElseThrow(() -> new InvalidInputException("removed.setId", "Satz gehört nicht zu Kunde/Fahrzeug des Auftrags"));
        if (set.isInHotel()) {
            throw new InvalidInputException("removed.setId", "Satz liegt schon im Pneuhotel");
        }
        if (!r.store() && set.getState() == TireSetState.WITH_CUSTOMER) {
            throw new InvalidInputException("removed.setId", r.dispose() ? "Nur montierte Räder werden entsorgt" : "Satz ist schon beim Kunden");
        }
        return set;
    }

    /** A known set or a new one – exactly one */
    private static void checkOneOf(UUID setId, TaskTireBookingRequest.NewSet newSet, String field) {
        if ((setId == null) == (newSet == null)) {
            throw new InvalidInputException(field, "Einen Satz wählen oder einen neuen erfassen");
        }
    }

    private static TireSetDetails details(Task task, TaskTireBookingRequest.NewSet n, String field) {
        if (n.season() == null) {
            throw new InvalidInputException(field + ".newSet.season", "Saison wählen");
        }
        if (n.kind() == null) {
            throw new InvalidInputException(field + ".newSet.kind", "Kompletträder oder nur Reifen?");
        }
        if (n.kind() != TireSetKind.WHEELS && n.rims() != null) {
            throw new InvalidInputException(field + ".newSet.rims", "nur bei Kompletträdern");
        }
        return new TireSetDetails(task.getCustomer(), task.getVehicle(), n.season(), n.kind(), n.rims(), n.hubCaps(), n.wheelBolts(),
                n.brand(), n.model(), n.dimension(), n.year(), n.remark(), n.torque(), n.pressureFront(), n.pressureRear());
    }

    /**
     * The sets of the task's vehicle – and those of the customer without a vehicle (e.g. taken over from
     * SwissGarage). Not the ones disposed of: they are gone.
     */
    private List<TireSet> candidates(Task task) {
        Vehicle vehicle = task.getVehicle();
        return repository.ofCustomer(task.getCustomer().getId()).stream()
                .filter(s -> s.getState() != TireSetState.DISPOSED)
                .filter(s -> vehicle == null || s.getVehicle() == null || s.getVehicle().equals(vehicle))
                .toList();
    }

    private TaskTiresDto dto(Task task) {
        List<TireSet> candidates = candidates(task);
        TireSet mounted = repository.bookedBy(task.getId(), MOUNTING).orElse(null);
        TireSet removed = repository.bookedBy(task.getId(), REMOVING).orElse(null);
        return new TaskTiresDto(
                mounted == null ? null : TireSetDto.of(mounted),
                mounted == null ? null : mounted.bookedAs(task.getId(), MOUNTING),
                removed == null ? null : TireSetDto.of(removed),
                removed == null ? null : removed.bookedAs(task.getId(), REMOVING),
                candidates.stream().filter(TireSet::isInHotel).map(TireSetDto::of).toList(),
                // the one on the car first, then the latest step first
                candidates.stream().filter(s -> !s.isInHotel())
                        .sorted(Comparator.comparing((TireSet s) -> s.getState() != TireSetState.MOUNTED)
                                .thenComparing(TireSet::lastEventDay, Comparator.reverseOrder()))
                        .map(TireSetDto::of).toList());
    }

    private Task findTask(UUID id) {
        return tasks.findById(id).orElseThrow(() -> new NotFoundException("Auftrag", id));
    }
}
