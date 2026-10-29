package ch.kruegel.workshop.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.UUID;

/** The reminders of tasks (17a). */
public interface TaskReminderRepository extends JpaRepository<TaskReminder, UUID> {

    boolean existsByTaskIdAndDropOffDate(UUID taskId, LocalDate dropOffDate);
}
