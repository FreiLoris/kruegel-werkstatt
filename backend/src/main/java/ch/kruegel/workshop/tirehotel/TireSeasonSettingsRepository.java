package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** The one row of the season change deadlines. */
public interface TireSeasonSettingsRepository extends JpaRepository<TireSeasonSettings, UUID> {
}
