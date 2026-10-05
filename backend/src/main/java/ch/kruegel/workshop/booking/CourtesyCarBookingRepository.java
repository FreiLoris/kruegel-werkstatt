package ch.kruegel.workshop.booking;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Database access for courtesy car bookings. */
public interface CourtesyCarBookingRepository extends JpaRepository<CourtesyCarBooking, UUID> {

    /**
     * Bookings of a car that block the period [from, to) – the same rule as the database
     * constraint (an early return frees the car). Used to say WHICH booking is in the way.
     *
     * @param excludeId a booking that is being moved – it must not block itself; empty for a new one
     */
    @EntityGraph(attributePaths = {"courtesyCar", "task", "task.customer"})
    @Query("""
            SELECT b FROM CourtesyCarBooking b
            WHERE b.courtesyCar.id = :carId
              AND (:excludeId IS NULL OR b.id <> :excludeId)
              AND b.period.pickupAt < :to
              AND (CASE WHEN b.returnedAt IS NOT NULL AND b.returnedAt < b.period.returnAt
                        THEN b.returnedAt ELSE b.period.returnAt END) > :from
            ORDER BY b.period.pickupAt""")
    List<CourtesyCarBooking> blocking(UUID carId, LocalDateTime from, LocalDateTime to, UUID excludeId);

    /** All bookings whose planned period touches [from, to) – calendar of the courtesy car page. */
    @EntityGraph(attributePaths = {"courtesyCar", "task", "task.customer"})
    @Query("""
            SELECT b FROM CourtesyCarBooking b
            WHERE b.period.pickupAt < :to AND b.period.returnAt > :from
            ORDER BY b.period.pickupAt""")
    List<CourtesyCarBooking> inPeriod(LocalDateTime from, LocalDateTime to);

    @EntityGraph(attributePaths = {"courtesyCar", "task", "task.customer"})
    List<CourtesyCarBooking> findByTaskIdOrderByPeriodPickupAt(UUID taskId);

    /** Bookings of a car that should be back by {@code now} but are not – oldest first. */
    @EntityGraph(attributePaths = {"courtesyCar", "task", "task.customer"})
    List<CourtesyCarBooking> findByCourtesyCarIdAndReturnedAtIsNullAndPeriodReturnAtLessThanEqualOrderByPeriodReturnAt(
            UUID courtesyCarId, LocalDateTime now);
}
