package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** The one row of the tyre hotel settings. */
public interface TireHotelSettingsRepository extends JpaRepository<TireHotelSettings, UUID> {
}
