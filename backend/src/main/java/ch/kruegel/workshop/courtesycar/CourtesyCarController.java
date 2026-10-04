package ch.kruegel.workshop.courtesycar;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API for courtesy cars. No DELETE: cars that are sold or returned are deactivated. */
@RestController
@RequestMapping("/api/courtesy-cars")
@Tag(name = "Courtesy cars")
class CourtesyCarController {

    private final CourtesyCarService service;

    CourtesyCarController(CourtesyCarService service) {
        this.service = service;
    }

    record CourtesyCarOrder(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "All courtesy cars in fixed order (default: only active ones)")
    @GetMapping
    List<CourtesyCarDto> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @Operation(summary = "Create courtesy car (put at the end)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<CourtesyCarDto> create(@Valid @RequestBody CourtesyCarRequest request) {
        CourtesyCarDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/courtesy-cars/" + created.id())).body(created);
    }

    @Operation(summary = "Edit courtesy car", description = "Needs the loaded `version` – otherwise 409.")
    @PutMapping("/{id}")
    CourtesyCarDto update(@PathVariable UUID id, @Valid @RequestBody CourtesyCarRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Take out of service (instead of delete)")
    @PostMapping("/{id}/deactivate")
    CourtesyCarDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Put back into service")
    @PostMapping("/{id}/activate")
    CourtesyCarDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @Operation(summary = "Set order (first ID = first card)")
    @PutMapping("/order")
    List<CourtesyCarDto> reorder(@Valid @RequestBody CourtesyCarOrder order) {
        return service.reorder(order.ids());
    }
}
