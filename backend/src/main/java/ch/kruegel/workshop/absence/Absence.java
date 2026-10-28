package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.employee.Employee;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.util.Objects;
import java.util.UUID;

/**
 * An absence of an employee: vacation, sick, external work at a company, training – from/to;
 * vacation with half days, everything else with optional clock times (FB-05). Deleted when entered by mistake (no archive: it is history, not a message).
 */
@Entity
public class Absence extends BaseEntity {

    public static final int COMPANY_MAX = 100;
    public static final int NOTE_MAX = 500;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AbsenceCategory category;

    private String company;

    private String note;

    @Embedded
    private AbsencePeriod period;

    /** The days entered together as a series (FB-33) – empty for a single entry */
    private UUID seriesId;

    protected Absence() {
        // for JPA
    }

    public Absence(Employee employee, AbsenceCategory category, String company, String note, AbsencePeriod period) {
        apply(employee, category, company, note, period);
    }

    /** One day of a series (FB-33) */
    public static Absence inSeries(UUID seriesId, Employee employee, AbsenceCategory category, String company, String note,
                                   AbsencePeriod period) {
        Absence absence = new Absence(employee, category, company, note, period);
        absence.seriesId = Objects.requireNonNull(seriesId, "seriesId");
        return absence;
    }

    public void update(Employee employee, AbsenceCategory category, String company, String note, AbsencePeriod period) {
        apply(employee, category, company, note, period);
    }

    private void apply(Employee employee, AbsenceCategory category, String company, String note, AbsencePeriod period) {
        this.employee = Objects.requireNonNull(employee, "employee");
        this.category = Objects.requireNonNull(category, "category");
        String cleanCompany = Texts.checkMaxLength(Texts.emptyToNull(company), COMPANY_MAX, "Company");
        if ((category == AbsenceCategory.EXTERNAL_WORK) != (cleanCompany != null)) {
            throw new IllegalArgumentException("A company exactly for external work: " + category + " / " + cleanCompany);
        }
        this.company = cleanCompany;
        this.note = Texts.checkMaxLength(Texts.emptyToNull(note), NOTE_MAX, "Note");
        Objects.requireNonNull(period, "period");
        // FB-05: vacation in half days (the statistics count them), everything else with times
        boolean vacation = category == AbsenceCategory.VACATION;
        boolean times = period.startTime() != null || period.endTime() != null;
        boolean halfDays = period.startsAfternoon() || period.endsNoon();
        if (vacation ? times : halfDays) {
            throw new IllegalArgumentException("Vacation with half days, everything else with times: " + category + " / " + period);
        }
        this.period = period;
    }

    public Employee getEmployee() {
        return employee;
    }

    public AbsenceCategory getCategory() {
        return category;
    }

    public String getCompany() {
        return company;
    }

    public String getNote() {
        return note;
    }

    public UUID getSeriesId() {
        return seriesId;
    }

    public AbsencePeriod getPeriod() {
        return period;
    }
}
