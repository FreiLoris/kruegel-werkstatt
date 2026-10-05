package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;

import java.time.LocalDate;

/**
 * What a to-do says – everything that is edited together.
 *
 * @param text     what to do; trimmed, required
 * @param assignee who takes care of it; empty = not assigned yet
 * @param dueDate  until when; empty = no deadline
 * @param shopping on the shopping list
 * @param task     the task it is about (by reference, not by its number – bug #14); empty = none
 */
public record TodoDetails(String text, Employee assignee, LocalDate dueDate, boolean shopping, Task task) {

    public TodoDetails {
        text = Texts.checkMaxLength(Texts.emptyToNull(text), Todo.TEXT_MAX, "Text");
        if (text == null) {
            throw new IllegalArgumentException("Text is required");
        }
    }
}
