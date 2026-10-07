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

/**
 * An absence of an employee: vacation, sick, external work at a company, training – from/to with
 * half days. Deleted when entered by mistake (no archive: it is history, not a message).
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

    protected Absence() {
        // for JPA
    }

    public Absence(Employee employee, AbsenceCategory category, String company, String note, AbsencePeriod period) {
        apply(employee, category, company, note, period);
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
        this.period = Objects.requireNonNull(period, "period");
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

    public AbsencePeriod getPeriod() {
        return period;
    }
}
