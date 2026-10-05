package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.task.Task;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * A courtesy car is given to someone for a period – the ONE place for this (bug #2: the old app
 * had two, so a car could be booked twice). Either for a task (the task's customer has the car)
 * or on its own with a free-text holder (e.g. a customer without workshop task, internal use).
 *
 * <p>Overlaps of the same car are refused by the database (exclusion constraint, V13) – the
 * service checks first only to give a friendly message.
 */
@Entity
public class CourtesyCarBooking extends BaseEntity {

    static final int HOLDER_MAX = 100;
    static final int NOTES_MAX = 500;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private CourtesyCar courtesyCar;

    /** Empty = booking without task */
    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    /** Who has the car when there is no task */
    private String holder;

    @Embedded
    private BookingPeriod period;

    /** When the car actually came back; empty = still out (or not picked up yet) */
    private LocalDateTime returnedAt;

    private String notes;

    protected CourtesyCarBooking() {
        // for JPA
    }

    private CourtesyCarBooking(CourtesyCar car, Task task, String holder, BookingPeriod period, String notes) {
        this.courtesyCar = Objects.requireNonNull(car, "courtesyCar");
        this.task = task;
        this.holder = holder;
        this.period = Objects.requireNonNull(period, "period");
        this.notes = Texts.checkMaxLength(Texts.emptyToNull(notes), NOTES_MAX, "Notes");
    }

    /** The task's customer gets the car. */
    public static CourtesyCarBooking forTask(CourtesyCar car, Task task, BookingPeriod period, String notes) {
        return new CourtesyCarBooking(car, Objects.requireNonNull(task, "task"), null, period, notes);
    }

    /** Booking without task – someone must be named. */
    public static CourtesyCarBooking forHolder(CourtesyCar car, String holder, BookingPeriod period, String notes) {
        String name = Texts.checkMaxLength(Texts.emptyToNull(holder), HOLDER_MAX, "Holder");
        if (name == null) {
            throw new IllegalArgumentException("A booking without task needs a holder");
        }
        return new CourtesyCarBooking(car, null, name, period, notes);
    }

    /** Another period or car (drag in the calendar, longer repair …). */
    public void reschedule(CourtesyCar car, BookingPeriod newPeriod) {
        this.courtesyCar = Objects.requireNonNull(car, "courtesyCar");
        this.period = Objects.requireNonNull(newPeriod, "period");
        if (returnedAt != null && returnedAt.isBefore(newPeriod.pickupAt())) {
            throw new IllegalArgumentException("Already returned before the new pickup: " + returnedAt);
        }
    }

    /**
     * The car is back. Early → it is free again from then on; late → recorded as it happened,
     * it does not block the next booking afterwards (see the constraint in V13).
     */
    public void recordReturn(LocalDateTime at) {
        Objects.requireNonNull(at, "at");
        if (at.isBefore(period.pickupAt())) {
            throw new IllegalArgumentException("Return before pickup: " + at);
        }
        this.returnedAt = at;
    }

    /** Return recorded by mistake. */
    public void undoReturn() {
        this.returnedAt = null;
    }

    public void changeNotes(String newNotes) {
        this.notes = Texts.checkMaxLength(Texts.emptyToNull(newNotes), NOTES_MAX, "Notes");
    }

    /** Until when the car is really taken: the actual return if it came back early, otherwise the planned one. */
    public LocalDateTime blockedUntil() {
        return returnedAt != null && returnedAt.isBefore(period.returnAt()) ? returnedAt : period.returnAt();
    }

    public boolean isReturned() {
        return returnedAt != null;
    }

    public CourtesyCar getCourtesyCar() {
        return courtesyCar;
    }

    public Task getTask() {
        return task;
    }

    public String getHolder() {
        return holder;
    }

    public BookingPeriod getPeriod() {
        return period;
    }

    public LocalDateTime getReturnedAt() {
        return returnedAt;
    }

    public String getNotes() {
        return notes;
    }
}
