package ch.kruegel.workshop.insurance;

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

/** REST API for insurances (FB-06). No DELETE: old tasks still name them – they are deactivated. */
@RestController
@RequestMapping("/api/insurances")
@Tag(name = "Insurances")
class InsuranceController {

    private final InsuranceService service;

    InsuranceController(InsuranceService service) {
        this.service = service;
    }

    @Operation(summary = "All insurances by name, also the deactivated ones")
    @GetMapping
    List<InsuranceDto> list() {
        return service.list();
    }

    @Operation(summary = "Add an insurance")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<InsuranceDto> create(@Valid @RequestBody InsuranceRequest request) {
        InsuranceDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/insurances/" + created.id())).body(created);
    }

    @Operation(summary = "Edit an insurance", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    InsuranceDto update(@PathVariable UUID id, @Valid @RequestBody InsuranceRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "No longer use (instead of delete) – tasks that name it keep it")
    @PostMapping("/{id}/deactivate")
    InsuranceDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Use again")
    @PostMapping("/{id}/activate")
    InsuranceDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }
}
