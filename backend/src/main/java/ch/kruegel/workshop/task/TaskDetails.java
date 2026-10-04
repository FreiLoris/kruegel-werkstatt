package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.vehicle.Vehicle;

import java.util.Objects;

/**
 * Everything that is entered for a task – in the wizard and when editing it.
 * Status, task number and position in the lift column are changed separately (own actions).
 *
 * @param customer    required
 * @param vehicle     may still be open, e.g. a new car that is not in SwissGarage yet
 * @param mechanic    who works on it; may still be open
 * @param lift        where; may still be open
 * @param notes       internal notes ("Notizen")
 */
public record TaskDetails(
        Customer customer,
        Vehicle vehicle,
        Appointment appointment,
        Employee mechanic,
        Lift lift,
        TaskWork work,
        String notes) {

    static final int NOTES_MAX = 2000;

    public TaskDetails {
        Objects.requireNonNull(customer, "customer");
        Objects.requireNonNull(appointment, "appointment");
        Objects.requireNonNull(work, "work");
        notes = Texts.checkMaxLength(Texts.emptyToNull(notes), NOTES_MAX, "Notes");
    }
}
