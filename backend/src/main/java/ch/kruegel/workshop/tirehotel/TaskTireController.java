package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** The tyre change of a task in the tyre hotel (13q). */
@RestController
@Tag(name = "Tyre hotel")
class TaskTireController {

    private final TaskTireService service;

    TaskTireController(TaskTireService service) {
        this.service = service;
    }

    @Operation(summary = "The tyre hotel seen from a task: what its tyre change booked, and the sets of its vehicle")
    @GetMapping("/api/tasks/{id}/tires")
    TaskTiresDto tires(@PathVariable UUID id) {
        return service.of(id);
    }

    @Operation(summary = "Book the tyre change of a task",
            description = "The set mounted is retrieved (measured first if depths are given), the one taken off is stored – "
                    + "a new set or one retrieved earlier, stored again. Each once per task; the day is today.")
    @PostMapping("/api/tasks/{id}/tires")
    TaskTiresDto book(@PathVariable UUID id, @Valid @RequestBody TaskTireBookingRequest request) {
        return service.book(id, request);
    }
}
