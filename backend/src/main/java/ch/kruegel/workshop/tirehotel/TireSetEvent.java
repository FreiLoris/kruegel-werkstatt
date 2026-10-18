package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.task.Task;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.time.LocalDate;
import java.util.Objects;

/** One step in the history of a set, with the tread depths of that moment. Who: {@link #getCreatedBy()}. */
@Entity
public class TireSetEvent extends BaseEntity {

    static final int NOTE_MAX = 500;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private TireSet tireSet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TireSetEventKind kind;

    @Column(nullable = false)
    private LocalDate happenedOn;

    @Embedded
    private TreadDepths depths;

    private String note;

    /** The place of that moment as text – the history stays as it was, also when a location is renamed */
    private String place;

    /** The task that did it (a tyre change booked from the task, 13q) – empty otherwise, or once the task is deleted */
    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    protected TireSetEvent() {
        // for JPA
    }

    TireSetEvent(TireSet tireSet, TireSetEventKind kind, LocalDate happenedOn, TreadDepths depths, TirePlace place, String note, Task task) {
        this.tireSet = Objects.requireNonNull(tireSet, "tireSet");
        this.kind = Objects.requireNonNull(kind, "kind");
        this.happenedOn = Objects.requireNonNull(happenedOn, "happenedOn");
        this.depths = depths;
        this.note = Texts.checkMaxLength(Texts.emptyToNull(note), NOTE_MAX, "Note");
        this.place = place == null ? null : place.getAddress();
        this.task = task;
    }

    public TireSet getTireSet() {
        return tireSet;
    }

    public TireSetEventKind getKind() {
        return kind;
    }

    public LocalDate getHappenedOn() {
        return happenedOn;
    }

    public TreadDepths getDepths() {
        return TreadDepths.orNone(depths);
    }

    public String getNote() {
        return note;
    }

    public String getPlace() {
        return place;
    }

    public Task getTask() {
        return task;
    }
}
