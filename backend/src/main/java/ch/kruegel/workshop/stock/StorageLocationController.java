package ch.kruegel.workshop.stock;

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

/** REST API for storage locations. No DELETE: ones no longer used are deactivated. */
@RestController
@RequestMapping("/api/storage-locations")
@Tag(name = "Storage locations")
class StorageLocationController {

    private final StorageLocationService service;

    StorageLocationController(StorageLocationService service) {
        this.service = service;
    }

    record StorageLocationOrder(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "All storage locations in fixed order (default: only active ones)")
    @GetMapping
    List<StorageLocationDto> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @Operation(summary = "Create storage location (put at the end)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<StorageLocationDto> create(@Valid @RequestBody StorageLocationRequest request) {
        StorageLocationDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/storage-locations/" + created.id())).body(created);
    }

    @Operation(summary = "Rename storage location", description = "Needs the loaded `version` – otherwise 409.")
    @PutMapping("/{id}")
    StorageLocationDto rename(@PathVariable UUID id, @Valid @RequestBody StorageLocationRequest request) {
        return service.rename(id, request);
    }

    @Operation(summary = "No longer use (instead of delete)")
    @PostMapping("/{id}/deactivate")
    StorageLocationDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Use again")
    @PostMapping("/{id}/activate")
    StorageLocationDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @Operation(summary = "Set order (first ID = top)")
    @PutMapping("/order")
    List<StorageLocationDto> reorder(@Valid @RequestBody StorageLocationOrder order) {
        return service.reorder(order.ids());
    }
}
