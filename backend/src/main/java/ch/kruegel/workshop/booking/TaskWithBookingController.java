package ch.kruegel.workshop.booking;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/** Wizard: create a task together with its courtesy car booking. */
@RestController
@Tag(name = "Tasks")
class TaskWithBookingController {

    private final TaskWithBookingService service;

    TaskWithBookingController(TaskWithBookingService service) {
        this.service = service;
    }

    @Operation(summary = "Create task with courtesy car",
            description = "Both or neither: if the car is taken (409, names the booking in the way) or a field is wrong "
                    + "(car fields as `courtesyCar.*`), the task is not saved either.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping("/api/tasks/with-courtesy-car")
    ResponseEntity<TaskWithBookingDto> create(@Valid @RequestBody TaskWithBookingRequest request) {
        TaskWithBookingDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/tasks/" + created.task().id())).body(created);
    }
}
