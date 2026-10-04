package ch.kruegel.workshop.task;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
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

    /** Highest position in a lift column of a day (lift empty = "not assigned yet" column); -1 if empty. */
    @Query("""
            SELECT coalesce(max(t.sortOrder), -1) FROM Task t
            WHERE t.appointment.date = :date
              AND ((:liftId IS NULL AND t.lift IS NULL) OR t.lift.id = :liftId)""")
    int maxSortOrder(LocalDate date, UUID liftId);

    boolean existsByTaskNumberAndIdNot(String taskNumber, UUID id);
}
