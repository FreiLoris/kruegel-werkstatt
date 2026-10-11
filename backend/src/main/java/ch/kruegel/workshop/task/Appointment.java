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
 * When the vehicle is in the workshop – or {@link #NONE}: the order is taken, but not planned yet
 * (12d-3). Then nothing here is set.
 *
 * <p>When the vehicle is in the workshop – Swiss local time, no time zone (an appointment is
 * "08:00 here", also after a daylight saving change).
 *
 * @param date            day of the appointment
 * @param time            start time
 * @param end             until when the task occupies its lift – after the start, may be on a later
 *                        day (a car waiting for parts)
 * @param arrivesEarlier  "Fahrzeug kommt früher" – e.g. dropped off the evening before; before the start
 * @param readyBy         "fertig bis" – when the customer needs the vehicle back; after the start
 * @param waitingCustomer customer waits on site – a flag, not a status (bug #4)
 * @param timeOpen        "Zeit offen" (12d-2): the clock time is not agreed yet. {@code time} and
 *                        {@code end} still reserve the lift – they are just not shown to anyone as
 *                        a time that was promised
 */
@Embeddable
public record Appointment(
        @Column(name = "appointment_date") LocalDate date,
        @Column(name = "appointment_time") LocalTime time,
        @Column(name = "appointment_end") LocalDateTime end,
        LocalDateTime arrivesEarlier,
        LocalDateTime readyBy,
        boolean waitingCustomer,
        boolean timeOpen) {

    /** Duration when nothing is given – short enough that it gets noticed and adjusted */
    public static final Duration DEFAULT_DURATION = Duration.ofHours(1);

    /** No appointment yet: the order waits in the list "Ohne Termin". */
    public static final Appointment NONE = new Appointment(null, null, null, null, null, false, false);

    public Appointment {
        if (date == null) {
            // without a day nothing else can be set – the database has the same rule (V22)
            if (time != null || end != null || arrivesEarlier != null || readyBy != null || waitingCustomer || timeOpen) {
                throw new IllegalArgumentException("Without a day an appointment has nothing else");
            }
        } else {
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
    }

    /** Is there a day and time? False for {@link #NONE}. */
    public boolean isPlanned() {
        return date != null;
    }

    /** An appointment at an agreed time – the usual case. */
    public Appointment(LocalDate date, LocalTime time, LocalDateTime end, LocalDateTime arrivesEarlier, LocalDateTime readyBy,
                       boolean waitingCustomer) {
        this(date, time, end, arrivesEarlier, readyBy, waitingCustomer, false);
    }

    /** Appointment of the default duration, without the optional parts. */
    public static Appointment at(LocalDate date, LocalTime time) {
        return new Appointment(date, time, date.atTime(time).plus(DEFAULT_DURATION), null, null, false);
    }

    /** Only for a planned appointment. */
    public LocalDateTime start() {
        if (!isPlanned()) {
            throw new IllegalStateException("No appointment yet");
        }
        return date.atTime(time);
    }

    public Duration duration() {
        return Duration.between(start(), end);
    }

    /**
     * The appointment at another time (drag & drop). On another day "kommt früher" and "fertig bis"
     * move by the same number of days (the car still comes the evening before); within the day they
     * stay. The caller checks first that they still fit (see {@link #shiftedToDay}). An open time
     * stays open: dragging the block plans the lift, it does not agree a time with the customer.
     */
    public Appointment movedTo(LocalDate newDate, LocalTime newTime, LocalDateTime newEnd) {
        return new Appointment(newDate, newTime, newEnd, shiftedToDay(arrivesEarlier, newDate), shiftedToDay(readyBy, newDate),
                waitingCustomer, timeOpen);
    }

    /** "kommt früher"/"fertig bis" when the appointment moves to {@code newDate}; empty stays empty. */
    public LocalDateTime shiftedToDay(LocalDateTime dateTime, LocalDate newDate) {
        return dateTime == null ? null : dateTime.plusDays(ChronoUnit.DAYS.between(date, newDate));
    }
}
