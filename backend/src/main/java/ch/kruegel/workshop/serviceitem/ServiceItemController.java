package ch.kruegel.workshop.serviceitem;

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

/** REST API for service items. No DELETE: items no longer offered are deactivated. */
@RestController
@RequestMapping("/api/service-items")
@Tag(name = "Service items")
class ServiceItemController {

    private final ServiceItemService service;

    ServiceItemController(ServiceItemService service) {
        this.service = service;
    }

    record ServiceItemOrder(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "All service items in fixed order (default: only active ones)")
    @GetMapping
    List<ServiceItemDto> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return service.list(includeInactive);
    }

    @Operation(summary = "Create service item (put at the end)")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<ServiceItemDto> create(@Valid @RequestBody ServiceItemRequest request) {
        ServiceItemDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/service-items/" + created.id())).body(created);
    }

    @Operation(summary = "Rename service item", description = "Needs the loaded `version` – otherwise 409.")
    @PutMapping("/{id}")
    ServiceItemDto rename(@PathVariable UUID id, @Valid @RequestBody ServiceItemRequest request) {
        return service.rename(id, request);
    }

    @Operation(summary = "No longer offer (instead of delete)")
    @PostMapping("/{id}/deactivate")
    ServiceItemDto deactivate(@PathVariable UUID id) {
        return service.deactivate(id);
    }

    @Operation(summary = "Offer again")
    @PostMapping("/{id}/activate")
    ServiceItemDto activate(@PathVariable UUID id) {
        return service.activate(id);
    }

    @Operation(summary = "Set order (first ID = top)")
    @PutMapping("/order")
    List<ServiceItemDto> reorder(@Valid @RequestBody ServiceItemOrder order) {
        return service.reorder(order.ids());
    }
}
