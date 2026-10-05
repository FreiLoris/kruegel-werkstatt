package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.lift.LiftRepository;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.serviceitem.ServiceItemRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * Tasks: create, edit, status, task number, delete.
 *
 * <p>References (customer, vehicle, mechanic, lift, service items) must be active when they are
 * newly chosen. A reference that is already on the task stays valid – an old task can still be
 * edited after the mechanic left or the lift was shut down.
 *
 * <p>Every input is checked BEFORE the task is changed (conventions: "check before change").
 */
@Service
@Transactional
public class TaskService {

    static final String TOPIC = "tasks";
    /** Longest period of one list request – a few weeks for calendar and capacity views */
    static final int MAX_DAYS = 92;

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);
    private static final Sort CALENDAR_ORDER = Sort.by("appointment.date", "appointment.time", "sortOrder");

    private final TaskRepository repository;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final EmployeeRepository employees;
    private final LiftRepository lifts;
    private final ServiceItemRepository serviceItems;
    private final ApplicationEventPublisher events;

    TaskService(TaskRepository repository, CustomerRepository customers, VehicleRepository vehicles,
                EmployeeRepository employees, LiftRepository lifts, ServiceItemRepository serviceItems,
                ApplicationEventPublisher events) {
        this.repository = repository;
        this.customers = customers;
        this.vehicles = vehicles;
        this.employees = employees;
        this.lifts = lifts;
        this.serviceItems = serviceItems;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<TaskDto> between(LocalDate from, LocalDate to) {
        // User-facing messages, hence German
        if (to.isBefore(from)) {
            throw new InvalidInputException("to", "darf nicht vor dem Startdatum liegen");
        }
        if (to.isAfter(from.plusDays(MAX_DAYS - 1))) {
            throw new InvalidInputException("to", "Zeitraum darf höchstens " + MAX_DAYS + " Tage umfassen");
        }
        return repository.findByAppointmentDateBetween(from, to, CALENDAR_ORDER).stream().map(TaskDto::of).toList();
    }

    /** The last 10 tasks of a customer, newest first. */
    @Transactional(readOnly = true)
    public List<TaskDto> history(UUID customerId) {
        return repository.findTop10ByCustomerIdOrderByAppointmentDateDescAppointmentTimeDesc(customerId).stream()
                .map(TaskDto::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskDto get(UUID id) {
        return TaskDto.of(find(id));
    }

    /** New task – at the end of its lift column. */
    public TaskDto create(TaskRequest request) {
        TaskDetails details = details(request, null);
        Task task = new Task(details, nextPosition(details));
        return saved(repository.save(task));
    }

    /** Edit – if day or lift change, the task moves to the end of the new column. */
    public TaskDto update(UUID id, TaskRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Task task = find(id);
        task.checkVersion(request.version());
        TaskDetails details = details(request, task);
        boolean otherColumn = !details.appointment().date().equals(task.getAppointment().date())
                || !Objects.equals(details.lift(), task.getLift());
        int position = otherColumn ? nextPosition(details) : task.getSortOrder();

        task.update(details);
        task.moveTo(position);
        return saved(task);
    }

    /**
     * No version needed: the status is set on its own (dashboard, task card) and must not fail
     * just because someone else edited the notes in the meantime.
     */
    public TaskDto changeStatus(UUID id, TaskStatus status) {
        Task task = find(id);
        task.changeStatus(status);
        return saved(task);
    }

    /**
     * Drag & drop: the task goes into the column of {@code liftId} on {@code date} (default: its day)
     * at {@code position}. BOTH affected columns are numbered 0, 1, 2 … again and saved – the old app
     * only saved the dragged card, so the neighbours jumped back after a reload (bug #5).
     * The time stays when the day changes (bug #6: the old app had an unused "guess the time").
     * No version needed, like the status: moving must not fail because of an unrelated edit.
     */
    public List<TaskDto> move(UUID id, TaskMoveRequest request) {
        Task task = find(id);
        Lift target = reference(lifts, request.liftId(), task.getLift(), "liftId", "Lift", Lift::isActive, "ist ausser Betrieb");
        LocalDate fromDay = task.getAppointment().date();
        LocalDate toDay = request.date() == null ? fromDay : request.date();
        boolean sameColumn = Objects.equals(target, task.getLift()) && toDay.equals(fromDay);

        // read both columns BEFORE changing anything (check before change, no auto flush surprises)
        List<Task> source = new ArrayList<>(repository.column(fromDay, liftId(task.getLift())));
        List<Task> destination = sameColumn ? source : new ArrayList<>(repository.column(toDay, liftId(target)));
        source.remove(task);
        destination.add(Math.min(request.position(), destination.size()), task);

        task.moveToDay(toDay);
        task.moveToLift(target);
        renumber(source);
        renumber(destination);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return destination.stream().map(TaskDto::of).toList();
    }

    private static void renumber(List<Task> column) {
        for (int i = 0; i < column.size(); i++) {
            column.get(i).moveTo(i);
        }
    }

    private static UUID liftId(Lift lift) {
        return lift == null ? null : lift.getId();
    }

    public TaskDto assignTaskNumber(UUID id, String taskNumber) {
        Task task = find(id);
        String number = taskNumber == null ? null : taskNumber.strip();
        if (number != null && !number.isEmpty() && repository.existsByTaskNumberAndIdNot(number, id)) {
            throw new InvalidInputException("taskNumber", "'" + number + "' ist bereits bei einem anderen Auftrag eingetragen");
        }
        task.assignTaskNumber(number);
        return saved(task);
    }

    /** Tasks are really deleted (unlike master data). The log keeps who did it. */
    public void delete(UUID id) {
        Task task = find(id);
        repository.delete(task);
        repository.flush();
        log.info("Task {} of {} deleted by person {}", id, task.getAppointment().date(), CurrentPerson.id().orElse(null));
        events.publishEvent(new DataChanged(TOPIC));
        // its courtesy car booking is deleted with it (ON DELETE CASCADE) – the booking views reload too.
        // Text instead of BookingService.TOPIC: booking depends on task, not the other way round.
        events.publishEvent(new DataChanged("courtesy-car-bookings"));
    }

    private TaskDetails details(TaskRequest request, Task current) {
        Customer customer = reference(customers, request.customerId(), current == null ? null : current.getCustomer(),
                "customerId", "Kunde", Customer::isActive, "ist nicht mehr aktiv");
        Vehicle vehicle = reference(vehicles, request.vehicleId(), current == null ? null : current.getVehicle(),
                "vehicleId", "Fahrzeug", Vehicle::isActive, "ist nicht mehr aktiv");
        Employee mechanic = reference(employees, request.mechanicId(), current == null ? null : current.getMechanic(),
                "mechanicId", "Mitarbeiter", e -> e.isActive() && e.isSelectableAsMechanic(), "ist nicht als Mechaniker wählbar");
        Lift lift = reference(lifts, request.liftId(), current == null ? null : current.getLift(),
                "liftId", "Lift", Lift::isActive, "ist ausser Betrieb");
        return new TaskDetails(customer, vehicle, appointment(request), mechanic, lift,
                work(request, current == null ? Set.of() : current.getWork().serviceItems()), request.notes());
    }

    private static Appointment appointment(TaskRequest request) {
        LocalDateTime start = request.date().atTime(request.time());
        if (request.arrivesEarlier() != null && !request.arrivesEarlier().isBefore(start)) {
            throw new InvalidInputException("arrivesEarlier", "muss vor dem Termin liegen");
        }
        if (request.readyBy() != null && !request.readyBy().isAfter(start)) {
            throw new InvalidInputException("readyBy", "muss nach dem Termin liegen");
        }
        return new Appointment(request.date(), request.time(), request.arrivesEarlier(), request.readyBy(),
                request.waitingCustomer());
    }

    private TaskWork work(TaskRequest request, Set<ServiceItem> current) {
        if (!request.tireChange() && request.tireChangeKind() != null) {
            throw new InvalidInputException("tireChangeKind", "nur mit Radwechsel");
        }
        if (!request.mfk() && request.mfkAppointment() != null) {
            throw new InvalidInputException("mfkAppointment", "nur mit MFK");
        }
        return new TaskWork(request.tireChange(), request.tireChangeKind(), request.mfk(), request.mfkAppointment(),
                serviceItems(request.serviceItemIds(), current),
                request.parts() == null ? null : request.parts().toPartsOrder(), request.workDescription());
    }

    private Set<ServiceItem> serviceItems(List<UUID> ids, Set<ServiceItem> current) {
        if (ids == null || ids.isEmpty()) {
            return Set.of();
        }
        Set<UUID> wanted = new HashSet<>(ids);
        List<ServiceItem> found = serviceItems.findAllById(wanted);
        if (found.size() != wanted.size()) {
            throw new InvalidInputException("serviceItemIds", "enthält eine Serviceleistung, die es nicht gibt");
        }
        for (ServiceItem item : found) {
            if (!item.isActive() && !current.contains(item)) {
                throw new InvalidInputException("serviceItemIds", "'" + item.getName() + "' wird nicht mehr angeboten");
            }
        }
        return new HashSet<>(found);
    }

    /**
     * Loads a referenced entity. Unchanged → kept as it is (may be inactive by now);
     * newly chosen → must exist and be usable.
     */
    private static <T extends BaseEntity> T reference(JpaRepository<T, UUID> repository, UUID id, T current, String field, String what,
                                   Predicate<T> usable, String notUsable) {
        if (id == null) {
            return null;
        }
        if (current != null && id.equals(current.getId())) {
            return current;
        }
        T found = repository.findById(id).orElseThrow(() -> new InvalidInputException(field, what + " gibt es nicht"));
        if (!usable.test(found)) {
            throw new InvalidInputException(field, what + " " + notUsable);
        }
        return found;
    }

    private int nextPosition(TaskDetails details) {
        UUID liftId = details.lift() == null ? null : details.lift().getId();
        return repository.maxSortOrder(details.appointment().date(), liftId) + 1;
    }

    private Task find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Auftrag", id));
    }

    private TaskDto saved(Task task) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return TaskDto.of(task);
    }
}
