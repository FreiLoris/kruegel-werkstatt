package ch.kruegel.workshop.screenlock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** The one row of the screen lock setting. */
public interface ScreenLockSettingsRepository extends JpaRepository<ScreenLockSettings, UUID> {
}
