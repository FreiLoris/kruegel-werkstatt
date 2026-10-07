package ch.kruegel.workshop.note;

import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.TaskRefDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** A note as delivered by the API. People only as IDs – the frontend has the employee list. */
public record NoteDto(
        UUID id,
        long version,
        String text,
        @Schema(types = {"string", "null"}) String info,
        @Schema(description = "In the order of the employee list") List<UUID> assigneeIds,
        @Schema(types = {"object", "null"}) TaskRefDto task,
        @Schema(types = {"string", "null"}, description = "Empty = on the board") Instant archivedAt,
        @Schema(description = "Sub-tasks (to-dos of this note)") long todoCount,
        @Schema(description = "… of which done") long todoDoneCount,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Author") UUID createdBy,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID updatedBy) {

    /** Sub-tasks of a note: how many, how many done */
    record TodoCount(long total, long done) {
        static final TodoCount NONE = new TodoCount(0, 0);
    }

    static NoteDto of(Note note, TodoCount todos) {
        List<UUID> assigneeIds = note.getAssignees().stream()
                .sorted(Comparator.comparingInt(Employee::getSortOrder).thenComparing(Employee::getName))
                .map(Employee::getId)
                .toList();
        return new NoteDto(note.getId(), note.getVersion(), note.getText(), note.getInfo(), assigneeIds,
                TaskRefDto.of(note.getTask()), note.getArchivedAt(), todos.total(), todos.done(),
                note.getCreatedAt(), note.getCreatedBy(), note.getUpdatedAt(), note.getUpdatedBy());
    }
}
