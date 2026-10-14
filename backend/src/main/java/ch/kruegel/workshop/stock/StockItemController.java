package ch.kruegel.workshop.stock;

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

/** REST API for the stock list (FB-08). */
@RestController
@RequestMapping("/api/stock-items")
@Tag(name = "Stock list")
class StockItemController {

    private final StockItemService service;

    StockItemController(StockItemService service) {
        this.service = service;
    }

    @Operation(summary = "The whole stock list by name", description = "Search, filters and sorting happen on the page.")
    @GetMapping
    List<StockItemDto> list() {
        return service.list();
    }

    @Operation(summary = "Add an article")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<StockItemDto> create(@Valid @RequestBody StockItemRequest request) {
        StockItemDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/stock-items/" + created.id())).body(created);
    }

    @Operation(summary = "Edit an article", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    StockItemDto update(@PathVariable UUID id, @Valid @RequestBody StockItemRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete an article")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
