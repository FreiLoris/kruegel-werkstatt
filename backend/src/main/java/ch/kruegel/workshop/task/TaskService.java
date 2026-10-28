package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.inspectionstation.InspectionStation;
import ch.kruegel.workshop.inspectionstation.InspectionStationRepository;
import ch.kruegel.workshop.insurance.Insurance;
import ch.kruegel.workshop.insurance.InsuranceRepository;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.lift.LiftRepository;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.serviceitem.ServiceItemRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
    private static final String LIFT_OVERLAP_CONSTRAINT = "task_no_lift_overlap";
    // user-facing, hence German format
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final Sort CALENDAR_ORDER = Sort.by("appointment.date", "appointment.time");

    private final TaskRepository repository;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final EmployeeRepository employees;
    private final LiftRepository lifts;
    private final ServiceItemRepository serviceItems;
    private final InsuranceRepository insurances;
    private final InspectionStationRepository stations;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final TaskNumbers numbers;

    TaskService(TaskRepository repository, CustomerRepository customers, VehicleRepository vehicles,
                EmployeeRepository employees, LiftRepository lifts, ServiceItemRepository serviceItems,
                InsuranceRepository insurances, InspectionStationRepository stations, ApplicationEventPublisher events,
                Clock clock, TaskNumbers numbers) {
        this.repository = repository;
        this.customers = customers;
        this.vehicles = vehicles;
        this.employees = employees;
        this.lifts = lifts;
        this.serviceItems = serviceItems;
        this.insurances = insurances;
        this.stations = stations;
        this.events = events;
        this.clock = clock;
        this.numbers = numbers;
    }

    @Transactional(readOnly = true)
    public List<TaskDto> between(LocalDate from, LocalDate to) {
        checkPeriod(from, to);
        return repository.findByAppointmentDateBetween(from, to, CALENDAR_ORDER).stream().map(TaskDto::of).toList();
    }

    /** Tasks with their MFK appointment in the period (both days inclusive) – the hints in the calendars (FB-10). */
    @Transactional(readOnly = true)
    public List<TaskDto> withMfkBetween(LocalDate from, LocalDate to) {
        checkPeriod(from, to);
        return repository.withMfkBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay()).stream().map(TaskDto::of).toList();
    }

    /** The day view: tasks starting that day plus those of earlier days still on their lift. */
    @Transactional(readOnly = true)
    public List<TaskDto> onDay(LocalDate day) {
        return repository.occupying(day, day.atStartOfDay()).stream().map(TaskDto::of).toList();
    }

    private static void checkPeriod(LocalDate from, LocalDate to) {
        // User-facing messages, hence German
        if (to.isBefore(from)) {
            throw new InvalidInputException("to", "darf nicht vor dem Startdatum liegen");
        }
        if (to.isAfter(from.plusDays(MAX_DAYS - 1))) {
            throw new InvalidInputException("to", "Zeitraum darf höchstens " + MAX_DAYS + " Tage umfassen");
        }
    }

    /** The last 10 tasks of a customer, newest first. */
    @Transactional(readOnly = true)
    public List<TaskDto> history(UUID customerId) {
        return repository.findTop10ByCustomerIdOrderByAppointmentDateDescAppointmentTimeDesc(customerId).stream()
                .map(TaskDto::of)
                .toList();
    }

    /** Orders without appointment: taken but not planned yet, or taken out of the plan again (12d-3). */
    @Transactional(readOnly = true)
    public List<TaskDto> withoutAppointment() {
        return repository.withoutAppointment().stream().map(TaskDto::of).toList();
    }

    /**
     * Carried over to {@code day} (FB-14): not finished, the appointment over before it. Computed, not
     * moved – the appointment stays as it was, its day says since when the task is carried.
     */
    @Transactional(readOnly = true)
    public List<TaskDto> carriedOver(LocalDate day) {
        return repository.carriedOverTo(day.atStartOfDay()).stream().map(TaskDto::of).toList();
    }

    /** Waiting for parts, their appointment over – shown with "Ohne Termin" (FB-15). */
    @Transactional(readOnly = true)
    public List<TaskDto> waitingForParts() {
        return repository.waitingForPartsSince(LocalDate.now(clock)).stream().map(TaskDto::of).toList();
    }


    @Transactional(readOnly = true)
    public TaskDto get(UUID id) {
        return TaskDto.of(find(id));
    }

    public TaskDto create(TaskRequest request) {
        TaskDetails details = details(request, null);
        Employee acceptedBy = acceptedBy(request, null);
        Insurance insurance = insurance(request, null);
        Employee mfkDriver = mfkDriver(request, null);
        InspectionStation mfkStation = mfkStation(request, null);
        checkLiftFree(details.lift(), details.appointment(), null);
        Task task = new Task(details);
        task.acceptedBy(acceptedBy);
        task.insuranceCase(insurance, request.claimNumber());
        task.mfkTrip(mfkStation, request.mfkMinutes(), mfkDriver);
        task.newTires(request.newTiresDimension(), request.newTiresCount());
        if (request.vehicleLocation() != null) {
            task.moveVehicle(request.vehicleLocation());
        }
        // last, after all checks: the number is only taken when the task is really saved
        task.assignTaskNumber(numbers.next());
        Task created = repository.save(task);
        orderNewTires(created, null);
        return saved(created);
    }

    public TaskDto update(UUID id, TaskRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Task task = find(id);
        task.checkVersion(request.version());
        TaskDetails details = details(request, task);
        Employee acceptedBy = acceptedBy(request, task.getAcceptedBy());
        Insurance insurance = insurance(request, task.getInsurance());
        Employee mfkDriver = mfkDriver(request, task.getMfkDriver());
        InspectionStation mfkStation = mfkStation(request, task.getMfkStation());
        checkLiftFree(details.lift(), details.appointment(), id);
        NewTires tiresBefore = NewTires.of(task);

        task.update(details);
        task.acceptedBy(acceptedBy);
        task.insuranceCase(insurance, request.claimNumber());
        task.mfkTrip(mfkStation, request.mfkMinutes(), mfkDriver);
        task.newTires(request.newTiresDimension(), request.newTiresCount());
        if (request.vehicleLocation() != null) {
            task.moveVehicle(request.vehicleLocation());
        }
        orderNewTires(task, tiresBefore);
        return saved(task);
    }

    /**
     * New tyres chosen or what to order changed (FB-25): the shopping list orders them or follows
     * (ShoppingService). Chosen otherwise again, the position stays there to be cancelled (it may be
     * ordered already).
     */
    private void orderNewTires(Task task, NewTires before) {
        NewTires now = NewTires.of(task);
        if (now != null && !now.equals(before)) {
            events.publishEvent(new NewTiresChosen(task.getId(), now.dimension(), now.count(), task.getAcceptedBy().getId()));
        }
    }

    /** What to order – null without new tyres */
    private record NewTires(String dimension, Integer count) {
        static NewTires of(Task task) {
            return task.getWork().tireChangeKind() == TireChangeKind.NEW_TIRES
                    ? new NewTires(task.getNewTiresDimension(), task.getNewTiresCount()) : null;
        }
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

    /** The car came in or went back (FB-16) – one tap in "Ohne Termin", no version needed, like the status. */
    public TaskDto moveVehicle(UUID id, VehicleLocation location) {
        Task task = find(id);
        task.moveVehicle(location);
        return saved(task);
    }

    /**
     * Drag & drop in the time grid (day view) or onto another day (week view): new lift, start and end.
     * "kommt früher" and "fertig bis" move along to another day; they must still fit the new start.
     * No version needed, like the status: moving must not fail because of an unrelated edit.
     */
    public TaskDto schedule(UUID id, TaskScheduleRequest request) {
        Task task = find(id);
        Appointment current = task.getAppointment();
        Lift lift = reference(lifts, request.liftId(), task.getLift(), "liftId", "Lift", Lift::isActive, "ist ausser Betrieb");
        LocalDateTime start = request.date().atTime(request.time());
        if (!request.endAt().isAfter(start)) {
            throw new InvalidInputException("endAt", "muss nach dem Beginn liegen");
        }
        if (!current.isPlanned()) {
            // an order from the list "Ohne Termin" gets its first place
            Appointment first = new Appointment(request.date(), request.time(), request.endAt(), null, null, false);
            checkLiftFree(lift, first, id);
            task.schedule(first, lift);
            return saved(task);
        }
        LocalDateTime earlier = current.shiftedToDay(current.arrivesEarlier(), request.date());
        if (earlier != null && !earlier.isBefore(start)) {
            throw new InvalidInputException("time", "liegt vor \u201eFahrzeug kommt früher\u201c (" + WHEN.format(earlier)
                    + ") \u2013 bitte im Auftrag anpassen");
        }
        LocalDateTime readyBy = current.shiftedToDay(current.readyBy(), request.date());
        if (readyBy != null && !readyBy.isAfter(start)) {
            throw new InvalidInputException("time", "liegt nach \u201efertig bis\u201c (" + WHEN.format(readyBy)
                    + ") \u2013 bitte im Auftrag anpassen");
        }
        Appointment moved = current.movedTo(request.date(), request.time(), request.endAt());
        checkLiftFree(lift, moved, id);

        task.schedule(moved, lift);
        return saved(task);
    }

    /**
     * Out of the plan again – the order stays and appears in the list "Ohne Termin". No version
     * needed, like moving: it is one click on the task, not an edit of its data.
     */
    public TaskDto removeAppointment(UUID id) {
        Task task = find(id);
        task.removeAppointment();
        return saved(task);
    }


    public TaskDto assignTaskNumber(UUID id, String taskNumber) {
        Task task = find(id);
        String number = freeTaskNumber(taskNumber, id);
        if (number == null) {
            throw new InvalidInputException("taskNumber", "Die Auftragsnummer kann geändert, aber nicht entfernt werden");
        }
        task.assignTaskNumber(number);
        return saved(task);
    }

    /**
     * The task number if no OTHER task has it (checked before anything is changed).
     *
     * @param ownId the task itself when editing – its own number is fine; empty for a new task
     */
    private String freeTaskNumber(String taskNumber, UUID ownId) {
        String number = taskNumber == null ? null : taskNumber.strip();
        if (number == null || number.isEmpty()) {
            return null;
        }
        boolean taken = ownId == null ? repository.existsByTaskNumber(number) : repository.existsByTaskNumberAndIdNot(number, ownId);
        if (taken) {
            throw new InvalidInputException("taskNumber", "'" + number + "' ist bereits bei einem anderen Auftrag eingetragen");
        }
        return number;
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
        // its to-dos and notes stay, without the link (ON DELETE SET NULL) – their lists reload too
        events.publishEvent(new DataChanged("todos"));
        events.publishEvent(new DataChanged("notes"));
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

    /** Who took the order – required; anyone active (the office accepts orders too, not only mechanics). */
    private Employee acceptedBy(TaskRequest request, Employee current) {
        if (request.acceptedById() == null) {
            throw new InvalidInputException("acceptedById", "Bitte wählen, wer den Auftrag angenommen hat");
        }
        return reference(employees, request.acceptedById(), current, "acceptedById", "Mitarbeiter", Employee::isActive, "ist nicht mehr aktiv");
    }

    /** Insurance case: a newly chosen insurance must be in use; the claim number needs one. */
    private Insurance insurance(TaskRequest request, Insurance current) {
        if (request.insuranceId() == null) {
            if (request.claimNumber() != null && !request.claimNumber().isBlank()) {
                throw new InvalidInputException("claimNumber", "nur mit Versicherung");
            }
            return null;
        }
        return reference(insurances, request.insuranceId(), current, "insuranceId", "Versicherung", Insurance::isActive,
                "wird nicht mehr verwendet");
    }

    /** Who drives the car to the inspection – anyone active, like the "Annehmer"; only with MFK. */
    private Employee mfkDriver(TaskRequest request, Employee current) {
        return reference(employees, request.mfkDriverId(), current, "mfkDriverId", "Mitarbeiter", Employee::isActive, "ist nicht mehr aktiv");
    }

    /**
     * Where the MFK is: a newly chosen station must be in use, the one of the task stays valid;
     * none given = the standard (nearly every inspection is there).
     */
    private InspectionStation mfkStation(TaskRequest request, InspectionStation current) {
        if (!request.mfk()) {
            return null;
        }
        if (request.mfkStationId() == null) {
            return stations.findStandard().orElse(null);
        }
        return reference(stations, request.mfkStationId(), current, "mfkStationId", "Prüfstelle", InspectionStation::isActive,
                "wird nicht mehr verwendet");
    }

    private static Appointment appointment(TaskRequest request) {
        if (request.date() == null) {
            // no appointment yet – then nothing may hang on one
            if (request.time() != null || request.endAt() != null || request.arrivesEarlier() != null || request.readyBy() != null
                    || request.liftId() != null || request.waitingCustomer() || request.timeOpen()) {
                throw new InvalidInputException("date", "Ohne Datum sind Uhrzeit, Lift, \u201ekommt früher\u201c, \u201efertig bis\u201c "
                        + "und Wartekunde nicht möglich");
            }
            return Appointment.NONE;
        }
        if (request.time() == null) {
            throw new InvalidInputException("time", "Uhrzeit angeben");
        }
        LocalDateTime start = request.date().atTime(request.time());
        LocalDateTime end = request.endAt() != null ? request.endAt() : start.plus(Appointment.DEFAULT_DURATION);
        if (!end.isAfter(start)) {
            throw new InvalidInputException("endAt", "muss nach dem Beginn liegen");
        }
        if (request.arrivesEarlier() != null && !request.arrivesEarlier().isBefore(start)) {
            throw new InvalidInputException("arrivesEarlier", "muss vor dem Termin liegen");
        }
        if (request.readyBy() != null && !request.readyBy().isAfter(start)) {
            throw new InvalidInputException("readyBy", "muss nach dem Termin liegen");
        }
        return new Appointment(request.date(), request.time(), end, request.arrivesEarlier(), request.readyBy(),
                request.waitingCustomer(), request.timeOpen());
    }

    private TaskWork work(TaskRequest request, Set<ServiceItem> current) {
        if (!request.tireChange() && request.tireChangeKind() != null) {
            throw new InvalidInputException("tireChangeKind", "nur mit Radwechsel");
        }
        if (request.tireChangeKind() != TireChangeKind.NEW_TIRES) {
            if (request.newTiresDimension() != null && !request.newTiresDimension().isBlank()) {
                throw new InvalidInputException("newTiresDimension", "nur mit \u201eNeue Reifen\u201c");
            }
            if (request.newTiresCount() != null) {
                throw new InvalidInputException("newTiresCount", "nur mit \u201eNeue Reifen\u201c");
            }
        }
        if (!request.mfk() && request.mfkAppointment() != null) {
            throw new InvalidInputException("mfkAppointment", "nur mit MFK");
        }
        if (!request.mfk() && request.mfkMinutes() != null) {
            throw new InvalidInputException("mfkMinutes", "nur mit MFK");
        }
        if (!request.mfk() && request.mfkDriverId() != null) {
            throw new InvalidInputException("mfkDriverId", "nur mit MFK");
        }
        if (!request.mfk() && request.mfkStationId() != null) {
            throw new InvalidInputException("mfkStationId", "nur mit MFK");
        }
        return new TaskWork(request.tireChange(), request.tireChangeKind(), request.mfk(), request.mfkAppointment(),
                serviceItems(request.serviceItemIds(), current), request.workDescription());
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

    private Task find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Auftrag", id));
    }

    /**
     * One lift, one car at a time (smoke test: no overlaps). Checked here first to say WHICH task is
     * in the way; the database constraint (V14) catches two devices in the same second.
     * Field "liftId": in the form the message appears at the lift.
     *
     * @param ownId the task being changed; empty for a new one
     */
    private void checkLiftFree(Lift lift, Appointment appointment, UUID ownId) {
        if (lift == null) {
            return;
        }
        List<Task> overlapping = repository.overlapping(lift.getId(), appointment, ownId);
        if (!overlapping.isEmpty()) {
            Task other = overlapping.getFirst();
            throw new InvalidInputException("liftId", "%s ist %s belegt (%s)".formatted(lift.getName(),
                    period(other.getAppointment()), other.getCustomer().getDetails().displayName()));
        }
    }

    /** "am 15.10.2026 von 08:00 bis 09:30" – or with both dates if the task lasts several days */
    private static String period(Appointment appointment) {
        if (appointment.end().toLocalDate().equals(appointment.date())) {
            return "am %s von %s bis %s".formatted(DAY.format(appointment.date()), TIME.format(appointment.time()),
                    TIME.format(appointment.end()));
        }
        return "von %s bis %s".formatted(WHEN.format(appointment.start()), WHEN.format(appointment.end()));
    }

    private TaskDto saved(Task task) {
        flush(task);
        events.publishEvent(new DataChanged(TOPIC));
        return TaskDto.of(task);
    }

    /**
     * Flush here so the lift constraint fires inside this method: two devices taking the same lift
     * in the same second → the second one gets a friendly message, not a generic 409.
     */
    private void flush(Task task) {
        try {
            repository.flush();
        } catch (DataIntegrityViolationException e) {
            if (Objects.toString(e.getMostSpecificCause().getMessage(), "").contains(LIFT_OVERLAP_CONSTRAINT)) {
                throw new BusinessRuleException(task.getLift().getName()
                        + " wurde gerade auf einem anderen Gerät für diese Zeit belegt. Bitte neu laden.");
            }
            throw e;
        }
    }
}
