package ch.kruegel.workshop.employee;

import java.time.LocalDate;

/** Helpers to create test data – tests should only state what matters to them. */
public final class EmployeeTestData {

    private EmployeeTestData() {
    }

    public static EmployeeDetails details(String name) {
        return new EmployeeDetails(name, Role.MECHANIC, "#9fc8f0", LocalDate.of(1990, 5, 18),
                25, true, true, true);
    }

    public static Employee employee(String name, int sortOrder) {
        return new Employee(details(name), sortOrder);
    }
}
