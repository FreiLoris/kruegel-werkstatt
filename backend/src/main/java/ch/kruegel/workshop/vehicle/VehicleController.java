package ch.kruegel.workshop.vehicle;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

/**
 * REST API for vehicles. Create/edit/deactivate only for LOCAL vehicles;
 * SwissGarage vehicles answer with 409 (ADR 0003).
 */
@RestController
@RequestMapping("/api/vehicles")
@Tag(name = "Vehicles")
class VehicleController {

    private final VehicleService service;

    VehicleController(VehicleService service) {
        this.service = service;
    }

    @Operation(summary = "All vehicles of a customer (active ones first)")
    @GetMapping
    List<VehicleDto> ofCustomer(@RequestParam UUID customerId) {
        return service.ofCustomer(customerId);
    }

    @Operation(summary = "Single vehicle")
    @GetMapping("/{id}")
    VehicleDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Create local vehicle")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<VehicleDto> create(@Valid @RequestBody VehicleRequest request) {
        VehicleDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/vehicles/" + created.id())).body(created);
    }

    @Operation(summary = "Edit local vehicle", description = "SwissGarage vehicles → 409. Needs the loaded `version`.")
    @PutMapping("/{id}")
    VehicleDto update(@PathVariable UUID id, @Valid @RequestBody VehicleRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Deactivate local vehicle (instead of delete)")
    @PostMapping("/{id}/deactivate")
    VehicleDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Activate local vehicle again")
    @PostMapping("/{id}/activate")
    VehicleDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }
}
