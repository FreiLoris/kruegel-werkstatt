package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.task.Task;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/** A to-do as delivered by the API. The person only as ID – the frontend has the employee list. */
public record TodoDto(
        UUID id,
        long version,
        String text,
        @Schema(types = {"string", "null"}, format = "uuid") UUID assigneeId,
        @Schema(types = {"string", "null"}, format = "date") LocalDate dueDate,
        boolean shopping,
        @Schema(types = {"object", "null"}, description = "The task it is about – enough to name it and open it") TodoTaskDto task,
        @Schema(types = {"string", "null"}, description = "Empty = open") Instant doneAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID doneBy,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID createdBy) {

    /** The task of a to-do, as a link: "Huber Peter, 15.10. 08:00 (A-17)". */
    public record TodoTaskDto(
            UUID id,
            @Schema(format = "date") LocalDate date,
            @Schema(type = "string", example = "08:00:00") LocalTime time,
            String customerName,
            @Schema(types = {"string", "null"}) String taskNumber) {

        static TodoTaskDto of(Task task) {
            return new TodoTaskDto(task.getId(), task.getAppointment().date(), task.getAppointment().time(),
                    task.getCustomer().getDetails().displayName(), task.getTaskNumber());
        }
    }

    static TodoDto of(Todo todo) {
        // getId() on a LAZY reference does not load it
        UUID assigneeId = todo.getAssignee() == null ? null : todo.getAssignee().getId();
        return new TodoDto(todo.getId(), todo.getVersion(), todo.getText(), assigneeId, todo.getDueDate(), todo.isShopping(),
                todo.getTask() == null ? null : TodoTaskDto.of(todo.getTask()), todo.getDoneAt(), todo.getDoneBy(),
                todo.getCreatedAt(), todo.getCreatedBy());
    }
}
