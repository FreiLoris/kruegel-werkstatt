package ch.kruegel.workshop.task;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;

/**
 * When the vehicle is in the workshop – Swiss local time, no time zone (an appointment is
 * "08:00 here", also after a daylight saving change).
 *
 * @param date            day of the appointment
 * @param time            start time
 * @param arrivesEarlier  "Fahrzeug kommt früher" – e.g. dropped off the evening before; before the start
 * @param readyBy         "fertig bis" – when the customer needs the vehicle back; after the start
 * @param waitingCustomer customer waits on site – a flag, not a status (bug #4)
 */
@Embeddable
public record Appointment(
        @Column(name = "appointment_date", nullable = false) LocalDate date,
        @Column(name = "appointment_time", nullable = false) LocalTime time,
        LocalDateTime arrivesEarlier,
        LocalDateTime readyBy,
        boolean waitingCustomer) {

    public Appointment {
        Objects.requireNonNull(date, "date");
        Objects.requireNonNull(time, "time");
        LocalDateTime start = date.atTime(time);
        if (arrivesEarlier != null && !arrivesEarlier.isBefore(start)) {
            throw new IllegalArgumentException("'Arrives earlier' must be before the appointment: " + arrivesEarlier);
        }
        if (readyBy != null && !readyBy.isAfter(start)) {
            throw new IllegalArgumentException("'Ready by' must be after the appointment: " + readyBy);
        }
    }

    /** Appointment without the optional parts. */
    public static Appointment at(LocalDate date, LocalTime time) {
        return new Appointment(date, time, null, null, false);
    }

    public LocalDateTime start() {
        return date.atTime(time);
    }
}
