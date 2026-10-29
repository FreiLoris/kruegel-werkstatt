package ch.kruegel.workshop.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** The one row of the reminder settings. */
public interface ReminderSettingsRepository extends JpaRepository<ReminderSettings, UUID> {
}
