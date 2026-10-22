package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

/** The deadlines of the season change (FB-21) – exactly one row (migration V46). */
@Entity
public class TireSeasonSettings extends BaseEntity {

    /** As stored and sent: "06-01" */
    static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("MM-dd");

    @Column(nullable = false)
    private String summerDeadline;

    @Column(nullable = false)
    private String winterDeadline;

    protected TireSeasonSettings() {
        // for JPA
    }

    public void update(MonthDay summer, MonthDay winter) {
        Objects.requireNonNull(summer, "summer");
        Objects.requireNonNull(winter, "winter");
        this.summerDeadline = summer.format(FORMAT);
        this.winterDeadline = winter.format(FORMAT);
    }

    public MonthDay getSummerDeadline() {
        return MonthDay.parse(summerDeadline, FORMAT);
    }

    public MonthDay getWinterDeadline() {
        return MonthDay.parse(winterDeadline, FORMAT);
    }
}
