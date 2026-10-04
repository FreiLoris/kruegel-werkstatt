package ch.kruegel.workshop.employee;

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

/**
 * REST API for employees. HTTP only – the logic lives in {@link EmployeeService}.
 *
 * <p>No DELETE: former employees are deactivated so old tasks keep their name.
 */
@RestController
@RequestMapping("/api/employees")
@Tag(name = "Employees")
class EmployeeController {

    private final EmployeeService service;

    EmployeeController(EmployeeService service) {
        this.service = service;
    }

    record EmployeeOrder(@NotEmpty List<UUID> ids) {
    }

    /** Default: only active ones (for selection fields). Administration fetches all with {@code includeInactive=true}. */
    @Operation(summary = "All employees in fixed order")
    @GetMapping
    List<EmployeeDto> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @Operation(summary = "Single employee")
    @GetMapping("/{id}")
    EmployeeDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Create employee (put at the end of the order)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<EmployeeDto> create(@Valid @RequestBody EmployeeRequest request) {
        EmployeeDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/employees/" + created.id())).body(created);
    }

    @Operation(summary = "Edit employee", description = "Needs the loaded `version` – otherwise 409 if changed in the meantime.")
    @PutMapping("/{id}")
    EmployeeDto update(@PathVariable UUID id, @Valid @RequestBody EmployeeRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Deactivate (instead of delete)")
    @PostMapping("/{id}/deactivate")
    EmployeeDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Activate again")
    @PostMapping("/{id}/activate")
    EmployeeDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @Operation(summary = "Set order (first ID = front)")
    @PutMapping("/order")
    List<EmployeeDto> reorder(@Valid @RequestBody EmployeeOrder order) {
        return service.reorder(order.ids());
    }
}
