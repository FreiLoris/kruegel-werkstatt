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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API of the label sheet formats (FB-07). */
@RestController
@RequestMapping("/api/label-formats")
@Tag(name = "Tyre hotel")
class LabelFormatController {

    private final LabelFormatService service;

    LabelFormatController(LabelFormatService service) {
        this.service = service;
    }

    @Operation(summary = "The label sheet formats, in their order")
    @GetMapping
    List<LabelFormatDto> list() {
        return service.list();
    }

    @Operation(summary = "Add a label sheet format", description = "The labels must fit on A4.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<LabelFormatDto> create(@Valid @RequestBody LabelFormatRequest request) {
        LabelFormatDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/label-formats/" + created.id())).body(created);
    }

    @Operation(summary = "Edit a label sheet format", description = "Needs the loaded `version`.")
    @PutMapping("/{id}")
    LabelFormatDto update(@PathVariable UUID id, @Valid @RequestBody LabelFormatRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete a label sheet format")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
