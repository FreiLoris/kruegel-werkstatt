package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.task.TaskRefDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A to-do as delivered by the API. The person only as ID – the frontend has the employee list. */
public record TodoDto(
        UUID id,
        long version,
        String text,
        @Schema(types = {"string", "null"}, format = "uuid") UUID assigneeId,
        @Schema(types = {"string", "null"}, format = "date") LocalDate dueDate,
        boolean shopping,
        @Schema(types = {"object", "null"}, description = "The task it is about – enough to name it and open it") TaskRefDto task,
        @Schema(types = {"string", "null"}, format = "uuid", description = "The note it is a sub-task of (pinboard)") UUID noteId,
        @Schema(types = {"string", "null"}, description = "Empty = open") Instant doneAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID doneBy,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID createdBy) {

    static TodoDto of(Todo todo) {
        // getId() on a LAZY reference does not load it
        UUID assigneeId = todo.getAssignee() == null ? null : todo.getAssignee().getId();
        return new TodoDto(todo.getId(), todo.getVersion(), todo.getText(), assigneeId, todo.getDueDate(), todo.isShopping(),
                TaskRefDto.of(todo.getTask()), todo.getNoteId(), todo.getDoneAt(), todo.getDoneBy(),
                todo.getCreatedAt(), todo.getCreatedBy());
    }
}
