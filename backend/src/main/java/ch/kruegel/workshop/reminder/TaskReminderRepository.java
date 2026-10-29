package ch.kruegel.workshop.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The reminders of tasks (17a). */
public interface TaskReminderRepository extends JpaRepository<TaskReminder, UUID> {

    /** Who was reminded already for these days – one query for the whole run */
    List<TaskReminder> findByDropOffDateBetween(LocalDate first, LocalDate last);
}
