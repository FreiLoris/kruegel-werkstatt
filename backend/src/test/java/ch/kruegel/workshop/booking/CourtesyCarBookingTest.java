package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarDetails;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit tests for the booking rules – no Spring, no database. */
class CourtesyCarBookingTest {

    private static final LocalDateTime EIGHT = LocalDateTime.of(2026, 10, 15, 8, 0);
    private static final LocalDateTime NOON = EIGHT.withHour(12);
    private static final LocalDateTime FIVE = EIGHT.withHour(17);

    private final CourtesyCar polo = new CourtesyCar(new CourtesyCarDetails("Ersatzwagen 1", "VW Polo", "ZH 10001", null, null), 0);

    @Test
    void returnMustBeAfterPickup() {
        assertThatThrownBy(() -> new BookingPeriod(NOON, NOON)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new BookingPeriod(FIVE, EIGHT)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void periodsTouchingAtTheEndDoNotOverlap() {
        BookingPeriod morning = new BookingPeriod(EIGHT, NOON);

        assertThat(morning.overlaps(new BookingPeriod(NOON, FIVE))).isFalse();
        assertThat(morning.overlaps(new BookingPeriod(NOON.minusMinutes(1), FIVE))).isTrue();
        assertThat(morning.overlaps(new BookingPeriod(EIGHT.plusHours(1), EIGHT.plusHours(2)))).isTrue();
    }

    @Test
    void bookingWithoutTaskNeedsAHolder() {
        assertThatThrownBy(() -> CourtesyCarBooking.forHolder(polo, "  ", new BookingPeriod(EIGHT, FIVE), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(CourtesyCarBooking.forHolder(polo, " Frau Muster ", new BookingPeriod(EIGHT, FIVE), null).getHolder())
                .isEqualTo("Frau Muster");
    }

    @Test
    void earlyReturnFreesTheCarLateReturnDoesNotBlockLonger() {
        CourtesyCarBooking booking = CourtesyCarBooking.forHolder(polo, "Frau Muster", new BookingPeriod(EIGHT, FIVE), null);
        assertThat(booking.blockedUntil()).isEqualTo(FIVE);

        booking.recordReturn(NOON);
        assertThat(booking.blockedUntil()).isEqualTo(NOON);

        booking.recordReturn(FIVE.plusHours(2));
        assertThat(booking.blockedUntil()).isEqualTo(FIVE);
        assertThat(booking.isReturned()).isTrue();
    }

    @Test
    void cannotBeReturnedBeforeThePickup() {
        CourtesyCarBooking booking = CourtesyCarBooking.forHolder(polo, "Frau Muster", new BookingPeriod(NOON, FIVE), null);

        assertThatThrownBy(() -> booking.recordReturn(EIGHT)).isInstanceOf(IllegalArgumentException.class);
    }
}
