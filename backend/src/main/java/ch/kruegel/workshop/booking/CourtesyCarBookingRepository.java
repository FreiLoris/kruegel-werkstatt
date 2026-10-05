package ch.kruegel.workshop.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Database access for courtesy car bookings. The availability queries follow with the API (7b). */
public interface CourtesyCarBookingRepository extends JpaRepository<CourtesyCarBooking, UUID> {

    /**
     * Bookings of a car that block the period [from, to) – the same rule as the database
     * constraint (an early return frees the car). Used to say WHICH booking is in the way.
     */
    @Query("""
            SELECT b FROM CourtesyCarBooking b
            WHERE b.courtesyCar.id = :carId
              AND b.period.pickupAt < :to
              AND (CASE WHEN b.returnedAt IS NOT NULL AND b.returnedAt < b.period.returnAt
                        THEN b.returnedAt ELSE b.period.returnAt END) > :from
            ORDER BY b.period.pickupAt""")
    List<CourtesyCarBooking> blocking(UUID carId, LocalDateTime from, LocalDateTime to);
}
