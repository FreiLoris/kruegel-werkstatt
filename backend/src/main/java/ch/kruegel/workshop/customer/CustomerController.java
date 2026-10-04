package ch.kruegel.workshop.customer;

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
import java.util.UUID;

/**
 * REST API for customers. Create/edit/deactivate only for LOCAL customers;
 * SwissGarage customers answer with 409 (ADR 0003).
 */
@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customers")
class CustomerController {

    private final CustomerService service;

    CustomerController(CustomerService service) {
        this.service = service;
    }

    @Operation(summary = "Single customer")
    @GetMapping("/{id}")
    CustomerDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Create local customer (walk-in)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<CustomerDto> create(@Valid @RequestBody CustomerRequest request) {
        CustomerDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/customers/" + created.id())).body(created);
    }

    @Operation(summary = "Edit local customer", description = "SwissGarage customers → 409. Needs the loaded `version`.")
    @PutMapping("/{id}")
    CustomerDto update(@PathVariable UUID id, @Valid @RequestBody CustomerRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Deactivate local customer (instead of delete)")
    @PostMapping("/{id}/deactivate")
    CustomerDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Activate local customer again")
    @PostMapping("/{id}/activate")
    CustomerDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }
}
