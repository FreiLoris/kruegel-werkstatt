package ch.kruegel.workshop.booking;

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
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** REST API for courtesy car bookings and THE availability check. */
@RestController
@RequestMapping("/api/courtesy-car-bookings")
@Tag(name = "Courtesy car bookings")
class BookingController {

    private final BookingService service;

    BookingController(BookingService service) {
        this.service = service;
    }

    @Operation(summary = "Bookings whose planned period touches [from, to) – max. 92 days")
    @GetMapping
    List<BookingDto> inPeriod(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return service.inPeriod(from, to);
    }

    @Operation(summary = "Bookings of a task")
    @GetMapping("/task/{taskId}")
    List<BookingDto> ofTask(@PathVariable UUID taskId) {
        return service.ofTask(taskId);
    }

    @Operation(summary = "Which courtesy cars are free in [from, to) – max. 92 days",
            description = "The ONE availability check for wizard, task and courtesy car page. "
                    + "`excludeBookingId`: a booking that is being moved does not count against itself.")
    @GetMapping("/availability")
    List<AvailabilityDto> availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
                                       @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
                                       @RequestParam(required = false) UUID excludeBookingId) {
        return service.availability(from, to, excludeBookingId);
    }

    @Operation(summary = "Book a courtesy car", description = "409 with a message naming the booking in the way.")
    @ApiResponse(responseCode = "201", description = "Booked")
    @PostMapping
    ResponseEntity<BookingDto> create(@Valid @RequestBody BookingRequest request) {
        BookingDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/courtesy-car-bookings/" + created.id())).body(created);
    }

    @Operation(summary = "Move a booking (car, period, notes)", description = "Needs the loaded `version`.")
    @PutMapping("/{id}")
    BookingDto update(@PathVariable UUID id, @Valid @RequestBody BookingRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Cancel a booking")
    @ApiResponse(responseCode = "204", description = "Cancelled")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void cancel(@PathVariable UUID id) {
        service.cancel(id);
    }

    @Operation(summary = "Record the return (empty = now)")
    @PostMapping("/{id}/return")
    BookingDto recordReturn(@PathVariable UUID id, @RequestBody(required = false) ReturnRequest request) {
        return service.recordReturn(id, request == null ? null : request.returnedAt());
    }

    @Operation(summary = "Undo a return recorded by mistake", description = "409 if the freed time was booked meanwhile.")
    @DeleteMapping("/{id}/return")
    BookingDto undoReturn(@PathVariable UUID id) {
        return service.undoReturn(id);
    }
}
