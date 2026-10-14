package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API for suppliers (FB-09). */
@RestController
@RequestMapping("/api/suppliers")
@Tag(name = "Suppliers")
class SupplierController {

    private final SupplierService service;

    SupplierController(SupplierService service) {
        this.service = service;
    }

    @Operation(summary = "All suppliers by name")
    @GetMapping
    List<SupplierDto> list() {
        return service.list();
    }

    @Operation(summary = "Add a supplier")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<SupplierDto> create(@Valid @RequestBody SupplierRequest request) {
        SupplierDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/suppliers/" + created.id())).body(created);
    }

    @Operation(summary = "Edit a supplier", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    SupplierDto update(@PathVariable UUID id, @Valid @RequestBody SupplierRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete a supplier", description = "Its articles in the stock list lose it.")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
