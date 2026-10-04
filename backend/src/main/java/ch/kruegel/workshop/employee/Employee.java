package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.time.LocalDate;

/**
 * A person who works (or worked) in the business.
 *
 * <p>Always created and changed through {@link EmployeeDetails} – the rules are checked
 * there. Former employees are {@linkplain #deactivate() deactivated}, not deleted, so old
 * tasks and notes keep their name.
 */
@Entity
public class Employee extends BaseEntity implements Sortable {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String color;

    private LocalDate birthday;

    private int vacationDaysPerYear;

    private boolean selectableAsMechanic;

    private boolean selectableForTodos;

    private boolean hasPinboardColumn;

    private boolean active;

    private int sortOrder;

    protected Employee() {
        // for JPA
    }

    public Employee(EmployeeDetails details, int sortOrder) {
        apply(details);
        this.active = true;
        this.sortOrder = sortOrder;
    }

    /** Changes all freely editable details at once. */
    public void update(EmployeeDetails details) {
        apply(details);
    }

    /** Person left the business: no longer selectable anywhere, but kept. */
    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    @Override
    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    private void apply(EmployeeDetails details) {
        this.name = details.name();
        this.role = details.role();
        this.color = details.color();
        this.birthday = details.birthday();
        this.vacationDaysPerYear = details.vacationDaysPerYear();
        this.selectableAsMechanic = details.selectableAsMechanic();
        this.selectableForTodos = details.selectableForTodos();
        this.hasPinboardColumn = details.hasPinboardColumn();
    }

    public EmployeeDetails getDetails() {
        return new EmployeeDetails(name, role, color, birthday, vacationDaysPerYear,
                selectableAsMechanic, selectableForTodos, hasPinboardColumn);
    }

    public String getName() {
        return name;
    }

    public Role getRole() {
        return role;
    }

    public String getColor() {
        return color;
    }

    public LocalDate getBirthday() {
        return birthday;
    }

    public int getVacationDaysPerYear() {
        return vacationDaysPerYear;
    }

    public boolean isSelectableAsMechanic() {
        return selectableAsMechanic;
    }

    public boolean isSelectableForTodos() {
        return selectableForTodos;
    }

    public boolean hasPinboardColumn() {
        return hasPinboardColumn;
    }

    public boolean isActive() {
        return active;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
