package ch.kruegel.workshop.task;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

/**
 * When the vehicle is in the workshop – Swiss local time, no time zone (an appointment is
 * "08:00 here", also after a daylight saving change).
 *
 * @param date            day of the appointment
 * @param time            start time
 * @param end             until when the task occupies its lift – after the start, may be on a later
 *                        day (a car waiting for parts)
 * @param arrivesEarlier  "Fahrzeug kommt früher" – e.g. dropped off the evening before; before the start
 * @param readyBy         "fertig bis" – when the customer needs the vehicle back; after the start
 * @param waitingCustomer customer waits on site – a flag, not a status (bug #4)
 */
@Embeddable
public record Appointment(
        @Column(name = "appointment_date", nullable = false) LocalDate date,
        @Column(name = "appointment_time", nullable = false) LocalTime time,
        @Column(name = "appointment_end", nullable = false) LocalDateTime end,
        LocalDateTime arrivesEarlier,
        LocalDateTime readyBy,
        boolean waitingCustomer) {

    /** Duration when nothing is given – short enough that it gets noticed and adjusted */
    public static final Duration DEFAULT_DURATION = Duration.ofHours(1);

    public Appointment {
        Objects.requireNonNull(date, "date");
        Objects.requireNonNull(time, "time");
        Objects.requireNonNull(end, "end");
        LocalDateTime start = date.atTime(time);
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("End must be after the start: " + start + " – " + end);
        }
        if (arrivesEarlier != null && !arrivesEarlier.isBefore(start)) {
            throw new IllegalArgumentException("'Arrives earlier' must be before the appointment: " + arrivesEarlier);
        }
        if (readyBy != null && !readyBy.isAfter(start)) {
            throw new IllegalArgumentException("'Ready by' must be after the appointment: " + readyBy);
        }
    }

    /** Appointment of the default duration, without the optional parts. */
    public static Appointment at(LocalDate date, LocalTime time) {
        return new Appointment(date, time, date.atTime(time).plus(DEFAULT_DURATION), null, null, false);
    }

    public LocalDateTime start() {
        return date.atTime(time);
    }

    public Duration duration() {
        return Duration.between(start(), end);
    }

    /**
     * The same appointment on another day (drag & drop in the week view). Time, end, "kommt früher"
     * and "fertig bis" keep their distance to the appointment – they move by the same number of days.
     */
    public Appointment onDay(LocalDate day) {
        long days = ChronoUnit.DAYS.between(date, day);
        return new Appointment(day, time, end.plusDays(days),
                arrivesEarlier == null ? null : arrivesEarlier.plusDays(days),
                readyBy == null ? null : readyBy.plusDays(days),
                waitingCustomer);
    }
}
