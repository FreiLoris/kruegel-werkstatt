package ch.kruegel.workshop.task;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
     * The last 10 tasks of a customer, newest first – history in the wizard.
     * Service items are not in the graph: a collection fetch together with a limit would be
     * limited in memory instead of in the database; they are loaded in batches instead.
     */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    List<Task> findTop10ByCustomerIdOrderByAppointmentDateDescAppointmentTimeDesc(UUID customerId);
}
