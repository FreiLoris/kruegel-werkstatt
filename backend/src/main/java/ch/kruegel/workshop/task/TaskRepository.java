package ch.kruegel.workshop.task;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Database access for tasks. */
public interface TaskRepository extends JpaRepository<Task, UUID> {

    /**
     * Tasks of a period with customer, vehicle and service items in ONE query –
     * a week has dozens of tasks, loading them one by one would be dozens of queries.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    List<Task> findByAppointmentDateBetween(LocalDate from, LocalDate to, Sort sort);

    /**
     * Orders that are taken but not planned (yet, or any more) – the one waiting longest first (12d-3).
     * Done ones are no longer waiting for an appointment (decision of the workshop).
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    @Query("SELECT t FROM Task t WHERE t.appointment.date IS NULL AND t.status <> ch.kruegel.workshop.task.TaskStatus.DONE ORDER BY t.createdAt")
    List<Task> withoutAppointment();

    /**
     * Waiting for parts with an appointment that is over (FB-15) – they would go under on their old
     * day. One planned again (a day from today on) is no longer listed. The longest waiting first.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.status = ch.kruegel.workshop.task.TaskStatus.WAITING_FOR_PARTS AND t.appointment.date < :today
            ORDER BY t.appointment.date, t.appointment.time""")
    List<Task> waitingForPartsSince(LocalDate today);

    /**
     * Not finished although their appointment is over (FB-14): received or in work, the end before the
     * given day (one ending at 24:00 is over at the start of the next one) – carried over to it. The
     * longest carried first. Waiting for parts is not carried (FB-15 shows those).
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.status IN (ch.kruegel.workshop.task.TaskStatus.RECEIVED, ch.kruegel.workshop.task.TaskStatus.IN_PROGRESS)
              AND t.appointment.end <= :dayStart
            ORDER BY t.appointment.end, t.id""")
    List<Task> carriedOverTo(LocalDateTime dayStart);


    /**
     * Tasks with their MFK appointment in [from, until) – the hints in the calendars (FB-10). Also
     * an order taken out of the plan: the appointment at the inspection station is still booked.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.mfkAppointment >= :from AND t.mfkAppointment < :until
            ORDER BY t.mfkAppointment""")
    List<Task> withMfkBetween(LocalDateTime from, LocalDateTime until);

    /**
     * Tasks that take time on {@code day}: started that day or earlier and not yet ended at its start.
     *
     * @param dayStart {@code day} at 00:00
     */
    @EntityGraph(attributePaths = {"customer", "vehicle", "serviceItems"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.appointment.date <= :day AND t.appointment.end > :dayStart
            ORDER BY t.appointment.date, t.appointment.time""")
    List<Task> occupying(LocalDate day, LocalDateTime dayStart);

    /**
     * Tasks on a lift that overlap [start, end) – the same rule as the database constraint (V14).
     * Used to say WHICH task is in the way.
     *
     * @param excludeId the task being changed – it must not block itself; empty for a new one
     */
    @EntityGraph(attributePaths = {"customer"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.lift.id = :liftId
              AND (:excludeId IS NULL OR t.id <> :excludeId)
              AND t.appointment.end > :start
              AND (t.appointment.date < :endDate OR (t.appointment.date = :endDate AND t.appointment.time < :endTime))
            ORDER BY t.appointment.date, t.appointment.time""")
    List<Task> overlapping(UUID liftId, LocalDateTime start, LocalDate endDate, LocalTime endTime, UUID excludeId);

    /** {@link #overlapping(UUID, LocalDateTime, LocalDate, LocalTime, UUID)} for an appointment. */
    default List<Task> overlapping(UUID liftId, Appointment appointment, UUID excludeId) {
        return overlapping(liftId, appointment.start(), appointment.end().toLocalDate(), appointment.end().toLocalTime(), excludeId);
    }

    boolean existsByTaskNumber(String taskNumber);

    boolean existsByTaskNumberAndIdNot(String taskNumber, UUID id);

    /** Several tasks with customer and vehicle in one query – for the search hits. */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    List<Task> findByIdIn(Collection<UUID> ids);

    /**
     * The tasks to remind of (17a): the car is to be brought between {@code first} and {@code last} – at
     * the appointment, or when it comes earlier – it is still at the customer's, the task is open and
     * ticked, the customer wants reminders. With customer and vehicle, for the text.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.remindCustomer = true AND t.customer.noReminders = false
              AND t.status IN (ch.kruegel.workshop.task.TaskStatus.RECEIVED, ch.kruegel.workshop.task.TaskStatus.WAITING_FOR_PARTS)
              AND t.vehicleLocation = ch.kruegel.workshop.task.VehicleLocation.AT_CUSTOMER
              AND ((t.appointment.arrivesEarlier >= :fromTime AND t.appointment.arrivesEarlier < :untilTime)
                OR (t.appointment.arrivesEarlier IS NULL AND t.appointment.date >= :from AND t.appointment.date < :until))""")
    List<Task> toRemind(LocalDateTime fromTime, LocalDateTime untilTime, LocalDate from, LocalDate until);

    default List<Task> toRemind(LocalDate first, LocalDate last) {
        return toRemind(first.atStartOfDay(), last.plusDays(1).atStartOfDay(), first, last.plusDays(1));
    }

    /**
     * The open tyre changes with a vehicle from that day on – "Termin geplant" of the season change
     * (FB-21); without appointment: taken from then on. One left open from an earlier season does not count.
     */
    @EntityGraph(attributePaths = {"vehicle"})
    @Query("""
            SELECT t FROM Task t
            WHERE t.tireChange = true AND t.status <> ch.kruegel.workshop.task.TaskStatus.DONE AND t.vehicle IS NOT NULL
              AND (t.appointment.date >= :from OR (t.appointment.date IS NULL AND t.createdAt >= :takenFrom))
            ORDER BY t.appointment.date NULLS LAST, t.createdAt""")
    List<Task> openTireChangesFrom(LocalDate from, Instant takenFrom);

    /**
     * The last 10 tasks of a customer, newest first – history in the wizard.
     * Service items are not in the graph: a collection fetch together with a limit would be
     * limited in memory instead of in the database; they are loaded in batches instead.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    List<Task> findTop10ByCustomerIdOrderByAppointmentDateDescAppointmentTimeDesc(UUID customerId);
}
