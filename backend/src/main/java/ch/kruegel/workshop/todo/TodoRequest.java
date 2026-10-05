package ch.kruegel.workshop.todo;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input for creating and editing a to-do. Done/undone has its own endpoint.
 *
 * @param assigneeId empty = not assigned yet; a newly chosen person must be active and selectable for to-dos
 * @param taskId     the task it is about; empty = none
 * @param version    only when editing
 */
public record TodoRequest(
        @NotBlank @Size(max = Todo.TEXT_MAX) String text,
        @Schema(types = {"string", "null"}, format = "uuid") UUID assigneeId,
        @Schema(types = {"string", "null"}, format = "date") LocalDate dueDate,
        @Schema(description = "Missing = false") Boolean shopping,
        @Schema(types = {"string", "null"}, format = "uuid") UUID taskId,
        @Schema(description = "Only needed when editing") Long version) {

    public TodoRequest {
        shopping = Boolean.TRUE.equals(shopping);
    }
}
