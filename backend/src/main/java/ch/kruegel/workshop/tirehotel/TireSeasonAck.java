package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.time.LocalDate;
import java.util.Objects;

/**
 * "Quittiert" (FB-21): this set is not changed in the season of `deadline` on purpose – e.g. the
 * winter tyres are driven down in summer. Who and when: created by / at.
 */
@Entity
public class TireSeasonAck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tire_set_id")
    private TireSet tireSet;

    @Column(nullable = false)
    private LocalDate deadline;

    private String reason;

    protected TireSeasonAck() {
        // for JPA
    }

    public TireSeasonAck(TireSet tireSet, LocalDate deadline, String reason) {
        this.tireSet = Objects.requireNonNull(tireSet, "tireSet");
        this.deadline = Objects.requireNonNull(deadline, "deadline");
        this.reason = reason;
    }

    public TireSet getTireSet() {
        return tireSet;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public String getReason() {
        return reason;
    }
}
