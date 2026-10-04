package ch.kruegel.workshop.lift;

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

/** REST API for lifts. No DELETE: decommissioned lifts are deactivated. */
@RestController
@RequestMapping("/api/lifts")
@Tag(name = "Lifts")
class LiftController {

    private final LiftService service;

    LiftController(LiftService service) {
        this.service = service;
    }

    record LiftOrder(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "All lifts in fixed order (default: only active ones)")
    @GetMapping
    List<LiftDto> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @Operation(summary = "Create lift (put at the end)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<LiftDto> create(@Valid @RequestBody LiftRequest request) {
        LiftDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/lifts/" + created.id())).body(created);
    }

    @Operation(summary = "Rename lift", description = "Needs the loaded `version` – otherwise 409.")
    @PutMapping("/{id}")
    LiftDto rename(@PathVariable UUID id, @Valid @RequestBody LiftRequest request) {
        return service.rename(id, request);
    }

    @Operation(summary = "Decommission (instead of delete) – the last active lift stays")
    @PostMapping("/{id}/deactivate")
    LiftDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Put back into service")
    @PostMapping("/{id}/activate")
    LiftDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @Operation(summary = "Set order (first ID = leftmost)")
    @PutMapping("/order")
    List<LiftDto> reorder(@Valid @RequestBody LiftOrder order) {
        return service.reorder(order.ids());
    }
}
