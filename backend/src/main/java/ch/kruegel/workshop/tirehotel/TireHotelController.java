package ch.kruegel.workshop.tirehotel;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** REST API of the tyre hotel (FB-07). No DELETE: a retrieved set keeps its history. */
@RestController
@Tag(name = "Tyre hotel")
class TireHotelController {

    private final TireHotelService service;

    TireHotelController(TireHotelService service) {
        this.service = service;
    }

    @Operation(summary = "The sets in the hotel (newest first) – or the retrieved ones (last retrieved first)")
    @GetMapping("/api/tire-sets")
    List<TireSetDto> list(@RequestParam(defaultValue = "true") boolean inHotel) {
        return service.list(inHotel);
    }

    @Operation(summary = "All sets of a vehicle, in the hotel or not (newest first)")
    @GetMapping("/api/vehicles/{vehicleId}/tire-sets")
    List<TireSetDto> ofVehicle(@PathVariable UUID vehicleId) {
        return service.ofVehicle(vehicleId);
    }

    @Operation(summary = "One set")
    @GetMapping("/api/tire-sets/{id}")
    TireSetDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @Operation(summary = "Its history: stored, measured, retrieved – with the depths of each moment, oldest first")
    @GetMapping("/api/tire-sets/{id}/history")
    List<TireSetEventDto> history(@PathVariable UUID id) {
        return service.history(id);
    }

    @Operation(summary = "Store a set", description = "With the depths measured then; the day defaults to today.")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping("/api/tire-sets")
    ResponseEntity<TireSetDto> store(@Valid @RequestBody TireSetRequest request) {
        TireSetDto created = service.store(request);
        return ResponseEntity.created(URI.create("/api/tire-sets/" + created.id())).body(created);
    }

    @Operation(summary = "Edit the data of a set", description = "Not its depths (→ measurements). Needs the loaded `version`.")
    @PutMapping("/api/tire-sets/{id}")
    TireSetDto update(@PathVariable UUID id, @Valid @RequestBody TireSetRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Measured again – the new depths, kept in the history")
    @PostMapping("/api/tire-sets/{id}/measurements")
    TireSetDto measure(@PathVariable UUID id, @Valid @RequestBody MeasurementRequest request) {
        return service.measure(id, request);
    }

    @Operation(summary = "Move the set onto another place – or give it its first one", description = "The place must be in use and free.")
    @PostMapping("/api/tire-sets/{id}/move")
    TireSetDto move(@PathVariable UUID id, @Valid @RequestBody MoveRequest request) {
        return service.move(id, request);
    }

    @Operation(summary = "Retrieve: the set leaves the hotel (it stays in the list of retrieved sets)", description = "Its place is free again.")
    @PostMapping("/api/tire-sets/{id}/retrieve")
    TireSetDto retrieve(@PathVariable UUID id, @Valid @RequestBody RetrieveRequest request) {
        return service.retrieve(id, request);
    }

    @Operation(summary = "Undo a retrieval made by mistake", description = "Only while it is the set's latest step; back onto the given place.")
    @PostMapping("/api/tire-sets/{id}/undo-retrieve")
    TireSetDto undoRetrieve(@PathVariable UUID id, @RequestBody UndoRetrieveRequest request) {
        return service.undoRetrieve(id, request);
    }

    @Operation(summary = "Tread limits of the tyre hotel")
    @GetMapping("/api/tire-hotel-settings")
    TireHotelSettingsDto settings() {
        return service.settings();
    }

    @Operation(summary = "Change the tread limits", description = "Needs the loaded `version`.")
    @PutMapping("/api/tire-hotel-settings")
    TireHotelSettingsDto updateSettings(@Valid @RequestBody TireHotelSettingsRequest request) {
        return service.updateSettings(request);
    }
}
