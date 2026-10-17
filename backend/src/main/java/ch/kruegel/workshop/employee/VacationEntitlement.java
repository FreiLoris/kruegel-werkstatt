package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.util.UUID;

/**
 * The vacation entitlement a person had in a past year – kept when the entitlement changes, so the
 * statistics of that year stay as they were. A year without one uses the current entitlement.
 */
@Entity
public class VacationEntitlement extends BaseEntity {

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false)
    private int days;

    protected VacationEntitlement() {
        // for JPA
    }

    VacationEntitlement(UUID employeeId, int year, int days) {
        this.employeeId = employeeId;
        this.year = year;
        this.days = days;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public int getYear() {
        return year;
    }

    public int getDays() {
        return days;
    }
}
