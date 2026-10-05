package ch.kruegel.workshop.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * From when to when a customer has a courtesy car – Swiss local time like appointments.
 * Half-open: a return at 12:00 and the next pickup at 12:00 do not collide.
 *
 * @param pickupAt when the customer takes the car
 * @param returnAt when it is planned to come back
 */
@Embeddable
public record BookingPeriod(
        @Column(name = "pickup_at", nullable = false) LocalDateTime pickupAt,
        @Column(name = "return_at", nullable = false) LocalDateTime returnAt) {

    public BookingPeriod {
        Objects.requireNonNull(pickupAt, "pickupAt");
        Objects.requireNonNull(returnAt, "returnAt");
        if (!returnAt.isAfter(pickupAt)) {
            throw new IllegalArgumentException("Return must be after pickup: " + pickupAt + " – " + returnAt);
        }
    }

    /** Same rule as the database constraint: [pickup, return) overlaps [other pickup, other return). */
    public boolean overlaps(BookingPeriod other) {
        return pickupAt.isBefore(other.returnAt) && other.pickupAt.isBefore(returnAt);
    }
}
