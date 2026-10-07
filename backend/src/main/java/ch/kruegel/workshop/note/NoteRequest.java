package ch.kruegel.workshop.note;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Input for creating and editing a note. Archiving and sub-tasks have their own endpoints.
 *
 * @param assigneeIds newly chosen people must be active and selectable for to-dos & notes
 * @param version     only when editing
 */
public record NoteRequest(
        @NotBlank @Size(max = Note.TEXT_MAX) String text,
        @Size(max = Note.INFO_MAX) @Schema(description = "Longer background (\"Infos\")") String info,
        @Schema(description = "Empty = nobody yet") List<UUID> assigneeIds,
        @Schema(types = {"string", "null"}, format = "uuid") UUID taskId,
        @Schema(description = "Only needed when editing") Long version) {
}
