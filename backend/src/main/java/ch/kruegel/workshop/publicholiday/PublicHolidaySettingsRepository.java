package ch.kruegel.workshop.publicholiday;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface PublicHolidaySettingsRepository extends JpaRepository<PublicHolidaySettings, UUID> {

    /** The only row – V61 creates it */
    default PublicHolidaySettings theSettings() {
        return findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Public holiday settings missing – migration V61 creates them"));
    }
}
