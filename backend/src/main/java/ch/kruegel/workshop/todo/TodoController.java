package ch.kruegel.workshop.todo;

import io.swagger.v3.oas.annotations.Operation;
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

/** REST API for to-dos (and the shopping list – to-dos with the flag `shopping`). */
@RestController
@RequestMapping("/api/todos")
@Tag(name = "To-dos")
class TodoController {

    private final TodoService service;

    TodoController(TodoService service) {
        this.service = service;
    }

    /** Ticked off or undone */
    record TodoDoneRequest(@NotNull Boolean done) {
    }

    @Operation(summary = "To-dos", description = "Open ones (default) by deadline – without deadline at the end; "
            + "`done=true`: the latest " + TodoService.DONE_LIMIT + " done ones, newest first. Filters: empty = all; "
            + "`unassigned=true`: only those without person.")
    @GetMapping
    List<TodoDto> list(@RequestParam(defaultValue = "false") boolean done,
                       @RequestParam(required = false) UUID assigneeId,
                       @RequestParam(defaultValue = "false") boolean unassigned,
                       @RequestParam(required = false) Boolean shopping,
                       @RequestParam(required = false) UUID taskId,
                       @RequestParam(required = false) UUID noteId) {
        return service.list(done, assigneeId, unassigned, shopping, taskId, noteId);
    }

    @Operation(summary = "Create to-do")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<TodoDto> create(@Valid @RequestBody TodoRequest request) {
        TodoDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/todos/" + created.id())).body(created);
    }

    @Operation(summary = "Edit to-do", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    TodoDto update(@PathVariable UUID id, @Valid @RequestBody TodoRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Tick off or undo", description = "No version needed. Remembers when and by whom.")
    @PutMapping("/{id}/done")
    TodoDto setDone(@PathVariable UUID id, @Valid @RequestBody TodoDoneRequest request) {
        return service.setDone(id, request.done());
    }

    @Operation(summary = "Delete to-do")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
