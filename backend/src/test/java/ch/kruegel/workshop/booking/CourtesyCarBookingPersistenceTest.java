package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.config.JpaConfig;
import ch.kruegel.workshop.common.config.TimeConfig;
import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarDetails;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.task.Appointment;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskDetails;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.task.TaskWork;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Bookings in the real database – above all: the DATABASE refuses two bookings of the same car
 * at the same time (bug #2, F2), whatever the application does.
 */
@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, TimeConfig.class})
class CourtesyCarBookingPersistenceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 15);
    private static final LocalDateTime EIGHT = DAY.atTime(8, 0);
    private static final LocalDateTime NOON = DAY.atTime(12, 0);
    private static final LocalDateTime FIVE = DAY.atTime(17, 0);

    @Autowired
    private EntityManager em;

    @Autowired
    private CourtesyCarBookingRepository bookings;

    @Autowired
    private TaskRepository tasks;

    private CourtesyCar polo;
    private CourtesyCar fabia;
    private Task task;

    @BeforeEach
    void cars() {
        polo = persist(new CourtesyCar(new CourtesyCarDetails("Test Polo", "VW Polo", null, null, null), 90));
        fabia = persist(new CourtesyCar(new CourtesyCarDetails("Test Fabia", "Skoda Fabia", null, null, null), 91));
        var huber = persist(CustomerTestData.local("Huber"));
        task = tasks.save(new Task(new TaskDetails(huber, null, Appointment.at(DAY, LocalTime.of(8, 0)), null, null,
                TaskWork.described(null), null), 0));
    }

    @Test
    void storesBookingForATask() {
        CourtesyCarBooking booking = bookings.saveAndFlush(CourtesyCarBooking.forTask(polo, task, new BookingPeriod(EIGHT, FIVE), "Tank voll"));
        em.clear();

        CourtesyCarBooking loaded = bookings.findById(booking.getId()).orElseThrow();
        assertThat(loaded.getTask().getId()).isEqualTo(task.getId());
        assertThat(loaded.getPeriod()).isEqualTo(new BookingPeriod(EIGHT, FIVE));
        assertThat(loaded.getNotes()).isEqualTo("Tank voll");
        assertThat(loaded.getReturnedAt()).isNull();
    }

    @Test
    void databaseRefusesTheSameCarTwiceAtTheSameTime() {
        bookings.saveAndFlush(CourtesyCarBooking.forTask(polo, task, new BookingPeriod(EIGHT, FIVE), null));

        assertThatThrownBy(() -> bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Muster", new BookingPeriod(NOON, FIVE.plusHours(1)), null)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("courtesy_car_booking_no_overlap");
    }

    @Test
    void backToBackAndOtherCarsAreFine() {
        bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Herr Früh", new BookingPeriod(EIGHT, NOON), null));

        bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Spät", new BookingPeriod(NOON, FIVE), null));
        bookings.saveAndFlush(CourtesyCarBooking.forHolder(fabia, "Herr Früh", new BookingPeriod(EIGHT, FIVE), null));

        assertThat(bookings.count()).isEqualTo(3);
    }

    @Test
    void anEarlyReturnFreesTheCar() {
        CourtesyCarBooking first = bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Herr Früh", new BookingPeriod(EIGHT, FIVE), null));
        first.recordReturn(NOON);
        bookings.saveAndFlush(first);

        bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Spät", new BookingPeriod(NOON.plusHours(1), FIVE), null));

        assertThat(bookings.blocking(polo.getId(), NOON, FIVE, null)).extracting(CourtesyCarBooking::getHolder).containsExactly("Frau Spät");
    }

    @Test
    void aLateReturnCanBeRecordedEvenIfTheNextBookingHasStarted() {
        CourtesyCarBooking first = bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Herr Früh", new BookingPeriod(EIGHT, NOON), null));
        bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Spät", new BookingPeriod(NOON, FIVE), null));

        first.recordReturn(NOON.plusHours(1));
        bookings.saveAndFlush(first);

        assertThat(bookings.findById(first.getId()).orElseThrow().getReturnedAt()).isEqualTo(NOON.plusHours(1));
    }

    @Test
    void blockingNamesTheBookingInTheWay() {
        bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Muster", new BookingPeriod(EIGHT, NOON), null));

        assertThat(bookings.blocking(polo.getId(), DAY.atTime(11, 0), FIVE, null)).hasSize(1);
        assertThat(bookings.blocking(polo.getId(), NOON, FIVE, null)).isEmpty();
        assertThat(bookings.blocking(fabia.getId(), EIGHT, FIVE, null)).isEmpty();
    }

    @Test
    void aBookingBeingMovedDoesNotBlockItself() {
        CourtesyCarBooking booking = bookings.saveAndFlush(CourtesyCarBooking.forHolder(polo, "Frau Muster", new BookingPeriod(EIGHT, NOON), null));

        assertThat(bookings.blocking(polo.getId(), DAY.atTime(10, 0), FIVE, booking.getId())).isEmpty();
        assertThat(bookings.blocking(polo.getId(), DAY.atTime(10, 0), FIVE, null)).hasSize(1);
    }

    @Test
    void deletingTheTaskDeletesItsBooking() {
        CourtesyCarBooking booking = bookings.saveAndFlush(CourtesyCarBooking.forTask(polo, task, new BookingPeriod(EIGHT, FIVE), null));
        em.clear();

        tasks.deleteById(task.getId());
        tasks.flush();
        em.clear();

        assertThat(bookings.findById(booking.getId())).isEmpty();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
