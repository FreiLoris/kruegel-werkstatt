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
import java.util.UUID;

/**
 * The tyre change of a task in the tyre hotel (FB-06/FB-07, 13q): the sheet prints the stored set
 * and its place; once the wheels are changed, the set mounted is retrieved and the one taken off
 * stored – in one step, with the depths noted on the sheet. The history keeps the task.
 */
@Service
@Transactional
public class TaskTireService {

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
        TireSet mounted = request.mounted() == null ? null : mountedSet(task, request.mounted(), candidates);
        TireSet removed = null;
        TirePlace place = null;
        if (request.removed() != null) {
            TaskTireBookingRequest.RemovedSet r = request.removed();
            if (repository.bookedBy(task.getId(), TireSetEventKind.STORED).isPresent()) {
                throw new BusinessRuleException("Die abmontierten Räder dieses Auftrags sind schon eingelagert.");
            }
            removed = r.setId() == null ? null : setToStoreAgain(r.setId(), mounted, candidates);
            // the place of the set mounted is free once it is retrieved – the wheels simply swap places
            place = r.placeId() == null ? null : hotel.freePlace(r.placeId(), mounted);
        }

        if (mounted != null) {
            TreadDepths depths = DepthsRequest.toDepths(request.mounted().depths());
            if (depths.lowest() != null) {
                mounted.measure(depths, today, note, task);
            }
            // its place is free now – the removed set may go there
            mounted.retrieve(today, note, task);
            repository.flush();
        }
        if (request.removed() != null) {
            TreadDepths depths = DepthsRequest.toDepths(request.removed().depths());
            if (removed != null) {
                removed.storeAgain(depths, today, place, note, task);
            } else {
                repository.save(new TireSet(newDetails(task, request.removed()), depths, today, place, note, task));
            }
        }
        repository.flush();
        events.publishEvent(new DataChanged(TireHotelService.TOPIC));
        return dto(task);
    }

    private TireSet mountedSet(Task task, TaskTireBookingRequest.MountedSet m, List<TireSet> candidates) {
        if (repository.bookedBy(task.getId(), TireSetEventKind.RETRIEVED).isPresent()) {
            throw new BusinessRuleException("Die montierten Räder dieses Auftrags sind schon ausgelagert.");
        }
        TireSet set = candidates.stream().filter(s -> s.getId().equals(m.setId())).findFirst()
                .orElseThrow(() -> new InvalidInputException("mounted.setId", "Satz gehört nicht zu Kunde/Fahrzeug des Auftrags"));
        if (!set.isInHotel()) {
            throw new InvalidInputException("mounted.setId", "Satz ist nicht im Pneuhotel");
        }
        return set;
    }

    private TireSet setToStoreAgain(UUID setId, TireSet mounted, List<TireSet> candidates) {
        if (mounted != null && mounted.getId().equals(setId)) {
            throw new InvalidInputException("removed.setId", "Derselbe Satz kann nicht montiert und eingelagert werden");
        }
        TireSet set = candidates.stream().filter(s -> s.getId().equals(setId)).findFirst()
                .orElseThrow(() -> new InvalidInputException("removed.setId", "Satz gehört nicht zu Kunde/Fahrzeug des Auftrags"));
        if (set.isInHotel()) {
            throw new InvalidInputException("removed.setId", "Satz liegt schon im Pneuhotel");
        }
        return set;
    }

    private static TireSetDetails newDetails(Task task, TaskTireBookingRequest.RemovedSet r) {
        if (r.season() == null) {
            throw new InvalidInputException("removed.season", "Saison wählen");
        }
        if (r.kind() == null) {
            throw new InvalidInputException("removed.kind", "Kompletträder oder nur Reifen?");
        }
        if (r.kind() != TireSetKind.WHEELS && r.rims() != null) {
            throw new InvalidInputException("removed.rims", "nur bei Kompletträdern");
        }
        return new TireSetDetails(task.getCustomer(), task.getVehicle(), r.season(), r.kind(), r.rims(), r.hubCaps(), r.wheelBolts(),
                r.brand(), r.model(), r.dimension(), r.year(), r.remark(), r.torque(), r.pressureFront(), r.pressureRear());
    }

    /** The sets of the task's vehicle – and those of the customer without a vehicle (e.g. taken over from SwissGarage). */
    private List<TireSet> candidates(Task task) {
        Vehicle vehicle = task.getVehicle();
        return repository.ofCustomer(task.getCustomer().getId()).stream()
                .filter(s -> vehicle == null || s.getVehicle() == null || s.getVehicle().equals(vehicle))
                .toList();
    }

    private TaskTiresDto dto(Task task) {
        List<TireSet> candidates = candidates(task);
        return new TaskTiresDto(
                repository.bookedBy(task.getId(), TireSetEventKind.RETRIEVED).map(TireSetDto::of).orElse(null),
                repository.bookedBy(task.getId(), TireSetEventKind.STORED).map(TireSetDto::of).orElse(null),
                candidates.stream().filter(TireSet::isInHotel).map(TireSetDto::of).toList(),
                candidates.stream().filter(s -> !s.isInHotel())
                        .sorted(Comparator.comparing(TireSet::getRetrievedOn).reversed())
                        .map(TireSetDto::of).toList());
    }

    private Task findTask(UUID id) {
        return tasks.findById(id).orElseThrow(() -> new NotFoundException("Auftrag", id));
    }
}
