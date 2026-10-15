package ch.kruegel.workshop.inspectionstation;

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
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API for inspection stations (FB-10). No DELETE: old tasks still name them – they are deactivated. */
@RestController
@RequestMapping("/api/inspection-stations")
@Tag(name = "Inspection stations")
class InspectionStationController {

    private final InspectionStationService service;

    InspectionStationController(InspectionStationService service) {
        this.service = service;
    }

    @Operation(summary = "All inspection stations, the standard first, then by name – also the deactivated ones")
    @GetMapping
    List<InspectionStationDto> list() {
        return service.list();
    }

    @Operation(summary = "Add an inspection station")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<InspectionStationDto> create(@Valid @RequestBody InspectionStationRequest request) {
        InspectionStationDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/inspection-stations/" + created.id())).body(created);
    }

    @Operation(summary = "Edit an inspection station", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    InspectionStationDto update(@PathVariable UUID id, @Valid @RequestBody InspectionStationRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Make it the standard – preset on new tasks instead of the one so far")
    @PostMapping("/{id}/standard")
    InspectionStationDto makeStandard(@PathVariable UUID id) {
        return service.makeStandard(id);
    }

    @Operation(summary = "No longer use (instead of delete) – tasks that name it keep it; not the standard")
    @PostMapping("/{id}/deactivate")
    InspectionStationDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Use again")
    @PostMapping("/{id}/activate")
    InspectionStationDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }
}
