package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** REST API for tasks (Aufträge/Termine). */
@RestController
@RequestMapping("/api/tasks")
@Tag(name = "Tasks")
class TaskController {

    private final TaskService service;
    private final TaskSearchService search;

    TaskController(TaskService service, TaskSearchService search) {
        this.service = service;
        this.search = search;
    }

    @Operation(summary = "Tasks from `from` to `to` (both inclusive, max. 92 days)",
            description = "By the day of their start, sorted by day and time.")
    @GetMapping
    List<TaskDto> between(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.between(from, to);
    }

    @Operation(summary = "Tasks that take time on a day",
            description = "Those starting that day and those of earlier days that are still on their lift "
                    + "(e.g. waiting for parts) – the day view. Sorted by start.")
    @GetMapping("/day")
    List<TaskDto> onDay(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.onDay(date);
    }

    @Operation(summary = "The last 10 tasks of a customer, newest first", description = "History in the wizard.")
    @GetMapping("/history")
    List<TaskDto> history(@RequestParam UUID customerId) {
        return service.history(customerId);
    }

    @Operation(summary = "Search all appointments",
            description = "Every word must occur in customer, plate, vehicle, task number, work or notes. "
                    + "Upcoming first (nearest first), then past ones (newest first). At least 2 characters.")
    @GetMapping("/search")
    TaskSearchResultDto search(@RequestParam String q, @RequestParam(defaultValue = "30") int limit) {
        return search.search(q, limit);
    }

    @Operation(summary = "Single task")
    @GetMapping("/{id}")
    TaskDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Create task", description = "Starts as RECEIVED. The lift must be free for the whole time.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<TaskDto> create(@Valid @RequestBody TaskRequest request) {
        TaskDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.id())).body(created);
    }

    @Operation(summary = "Edit task", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    TaskDto update(@PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Change status", description = "No version needed – the status is changed on its own.")
    @PutMapping("/{id}/status")
    TaskDto changeStatus(@PathVariable UUID id, @Valid @RequestBody TaskStatusRequest request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "New lift, start and end (drag & drop)",
            description = "No version needed. The lift must be free; \"kommt früher\"/\"fertig bis\" move along to another day.")
    @PutMapping("/{id}/schedule")
    TaskDto schedule(@PathVariable UUID id, @Valid @RequestBody TaskScheduleRequest request) {
        return service.schedule(id, request);
    }

    @Operation(summary = "Set or remove the SwissGarage order number", description = "Must be unique.")
    @PutMapping("/{id}/task-number")
    TaskDto assignTaskNumber(@PathVariable UUID id, @Valid @RequestBody TaskNumberRequest request) {
        return service.assignTaskNumber(id, request.taskNumber());
    }

    @Operation(summary = "Delete task")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
