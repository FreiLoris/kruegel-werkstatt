package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API of the locations and places of the tyre hotel (FB-07). */
@RestController
@Tag(name = "Tyre hotel")
class TireLocationController {

    private final TireLocationService service;

    TireLocationController(TireLocationService service) {
        this.service = service;
    }

    @Operation(summary = "The locations, in their order")
    @GetMapping("/api/tire-locations")
    List<TireLocationDto> list() {
        return service.list();
    }

    @Operation(summary = "All places, by location and position", description = "Which set lies where: the sets name their place.")
    @GetMapping("/api/tire-places")
    List<TirePlaceDto> places() {
        return service.places();
    }

    @Operation(summary = "Add a location", description = "Its places are generated from the sizes.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping("/api/tire-locations")
    ResponseEntity<TireLocationDto> create(@Valid @RequestBody TireLocationRequest request) {
        TireLocationDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/tire-locations/" + created.id())).body(created);
    }

    @Operation(summary = "Edit a location", description = "Code, name and sizes – not the kind. Smaller only where no set lies. "
            + "Needs the loaded `version`.")
    @PutMapping("/api/tire-locations/{id}")
    TireLocationDto update(@PathVariable UUID id, @Valid @RequestBody TireLocationRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete a location – only while no set lies there")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/api/tire-locations/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
