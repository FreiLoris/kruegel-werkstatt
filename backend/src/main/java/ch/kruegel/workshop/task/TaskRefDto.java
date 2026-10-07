package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * A task as a link from somewhere else (to-do, note): enough to name it – "Huber Peter, 15.10. 08:00
 * (A-17)" – and to open it. By ID, never by its number (bug #14).
 */
public record TaskRefDto(
        UUID id,
        @Schema(format = "date") LocalDate date,
        @Schema(type = "string", example = "08:00:00") LocalTime time,
        String customerName,
        @Schema(types = {"string", "null"}) String taskNumber) {

    /** The task as a link; empty stays empty. Needs the customer loaded (or a session open). */
    public static TaskRefDto of(Task task) {
        if (task == null) {
            return null;
        }
        return new TaskRefDto(task.getId(), task.getAppointment().date(), task.getAppointment().time(),
                task.getCustomer().getDetails().displayName(), task.getTaskNumber());
    }
}
