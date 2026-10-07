package ch.kruegel.workshop.note;

import ch.kruegel.workshop.todo.TodoDto;
import ch.kruegel.workshop.todo.TodoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API for pinboard notes and their sub-tasks. */
@RestController
@RequestMapping("/api/notes")
@Tag(name = "Notes")
class NoteController {

    private final NoteService service;

    NoteController(NoteService service) {
        this.service = service;
    }

    /** Dragged from one column to another; empty = the column "Neu" */
    record NoteMoveRequest(
            @Schema(types = {"string", "null"}, format = "uuid") UUID fromEmployeeId,
            @Schema(types = {"string", "null"}, format = "uuid") UUID toEmployeeId) {
    }

    /** Put away or back on the board */
    record NoteArchivedRequest(@NotNull Boolean archived) {
    }

    @Operation(summary = "Notes", description = "On the board (default), newest first – filters person / nobody / task. "
            + "`archived=true`: the archive, latest " + NoteService.ARCHIVE_LIMIT + ", searchable with `q` (text and info).")
    @GetMapping
    List<NoteDto> list(@RequestParam(defaultValue = "false") boolean archived,
                       @RequestParam(required = false) UUID assigneeId,
                       @RequestParam(defaultValue = "false") boolean unassigned,
                       @RequestParam(required = false) UUID taskId,
                       @RequestParam(required = false) String q) {
        return service.list(archived, assigneeId, unassigned, taskId, q);
    }

    @Operation(summary = "Single note")
    @GetMapping("/{id}")
    NoteDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Create note", description = "The author is the person of the device.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<NoteDto> create(@Valid @RequestBody NoteRequest request) {
        NoteDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/notes/" + created.id())).body(created);
    }

    @Operation(summary = "Edit note", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    NoteDto update(@PathVariable UUID id, @Valid @RequestBody NoteRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Archive or reactivate", description = "Archiving ticks off the open sub-tasks; reactivating "
            + "reopens exactly those. No version needed.")
    @PutMapping("/{id}/archived")
    NoteDto setArchived(@PathVariable UUID id, @Valid @RequestBody NoteArchivedRequest request) {
        return service.setArchived(id, request.archived());
    }

    @Operation(summary = "Move between pinboard columns", description = "The person `from` gives the note away, `to` "
            + "takes it – other people stay. Empty = the column \"Neu\". No version needed; not on an archived note (409).")
    @PutMapping("/{id}/move")
    NoteDto move(@PathVariable UUID id, @RequestBody NoteMoveRequest request) {
        return service.move(id, request.fromEmployeeId(), request.toEmployeeId());
    }

    @Operation(summary = "Delete note", description = "With its sub-tasks. Normally a note is archived instead.")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @Operation(summary = "Add a sub-task", description = "An ordinary to-do with a link to the note – it appears in "
            + "the to-do lists too. Not on an archived note (409). Its `taskId` is ignored: the note has the task.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping("/{id}/todos")
    ResponseEntity<TodoDto> addTodo(@PathVariable UUID id, @Valid @RequestBody TodoRequest request) {
        TodoDto created = service.addTodo(id, request);
        return ResponseEntity.created(URI.create("/api/todos/" + created.id())).body(created);
    }
}
