package ch.kruegel.workshop.shopping;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

/** REST API for the shopping list (FB-20) and the parts of a task (FB-19). */
@RestController
@RequestMapping("/api/shopping-items")
@Tag(name = "Shopping list")
class ShoppingController {

    private final ShoppingService service;

    ShoppingController(ShoppingService service) {
        this.service = service;
    }

    record ShoppingStatusRequest(@NotNull ShoppingStatus status) {
    }

    record ShoppingNoteRequest(@NotBlank @Size(max = ShoppingEntry.TEXT_MAX) String text) {
    }

    @Operation(summary = "Positions of the shopping list", description = "Open (default): not ordered yet first, then ordered – "
            + "each oldest first; `arrived=true`: the latest " + ShoppingService.DONE_LIMIT + " done ones (arrived or cancelled). "
            + "`taskId`: all positions of that task, whatever their state; `taskIds`: those of several tasks (\"Ohne Termin\").")
    @GetMapping
    List<ShoppingItemDto> list(@RequestParam(defaultValue = "false") boolean arrived, @RequestParam(required = false) UUID taskId,
                               @RequestParam(required = false) List<UUID> taskIds) {
        return service.list(arrived, taskId, taskIds);
    }

    @Operation(summary = "One position")
    @GetMapping("/{id}")
    ShoppingItemDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Its history", description = "Notes and changes of state, oldest first.")
    @GetMapping("/{id}/entries")
    List<ShoppingEntryDto> entries(@PathVariable UUID id) {
        return service.entries(id);
    }

    @Operation(summary = "Put on the list", description = "\"Bestellen durch\" gets a to-do.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<ShoppingItemDto> create(@Valid @RequestBody ShoppingItemRequest request) {
        ShoppingItemDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/shopping-items/" + created.id())).body(created);
    }

    @Operation(summary = "Edit a position", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    ShoppingItemDto update(@PathVariable UUID id, @Valid @RequestBody ShoppingItemRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Change the state", description = "No version needed. The to-do of \"Bestellen durch\" is open while we are up "
            + "(to order, Rückfrage, quote received) and done while the supplier is up or once ordered.")
    @PutMapping("/{id}/status")
    ShoppingItemDto changeStatus(@PathVariable UUID id, @Valid @RequestBody ShoppingStatusRequest request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Add a note", description = "E.g. what the supplier said – with who and when.")
    @ApiResponse(responseCode = "201", description = "Added")
    @PostMapping("/{id}/entries")
    @ResponseStatus(HttpStatus.CREATED)
    ShoppingEntryDto addNote(@PathVariable UUID id, @Valid @RequestBody ShoppingNoteRequest request) {
        return service.addNote(id, request.text());
    }

    @Operation(summary = "Delete a position", description = "Its to-do goes with it.")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
