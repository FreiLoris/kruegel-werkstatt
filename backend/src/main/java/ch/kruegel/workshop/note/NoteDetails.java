package ch.kruegel.workshop.note;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;

import java.util.Set;

/**
 * What a note says – everything that is edited together.
 *
 * @param text      the message; trimmed, required
 * @param info      longer background ("Infos"); empty = none
 * @param assignees who takes care of it – none, one or several
 * @param task      the task it is about (by reference – F8, bug #14); empty = none
 */
public record NoteDetails(String text, String info, Set<Employee> assignees, Task task) {

    public NoteDetails {
        text = Texts.checkMaxLength(Texts.emptyToNull(text), Note.TEXT_MAX, "Text");
        if (text == null) {
            throw new IllegalArgumentException("Text is required");
        }
        info = Texts.checkMaxLength(Texts.emptyToNull(info), Note.INFO_MAX, "Info");
        assignees = assignees == null ? Set.of() : Set.copyOf(assignees);
    }
}
