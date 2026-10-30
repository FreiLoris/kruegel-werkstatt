package ch.kruegel.workshop.publicholiday;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface PublicHolidaySettingsRepository extends JpaRepository<PublicHolidaySettings, UUID> {
}
