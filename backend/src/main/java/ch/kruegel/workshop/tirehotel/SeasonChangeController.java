package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

/** REST API of the season change overview (FB-21). */
@RestController
@Tag(name = "Tyre hotel")
class SeasonChangeController {

    private final SeasonChangeService service;

    SeasonChangeController(SeasonChangeService service) {
        this.service = service;
    }

    @Operation(summary = "The season change overview",
            description = "The season whose deadline is nearest to the day: per set changed, planned, open, acknowledged or "
                    + "stored for longer. All-season sets are left out.")
    @GetMapping("/api/tire-season")
    SeasonChangeDto overview(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day) {
        return service.overview(day);
    }

    @Operation(summary = "Acknowledge a set for the current season", description = "Not changed on purpose; 409 if already done.")
    @PostMapping("/api/tire-season/acks")
    @ResponseStatus(HttpStatus.CREATED)
    SeasonChangeDto.Ack acknowledge(@Valid @RequestBody TireSeasonAckRequest request) {
        return service.acknowledge(request);
    }

    @Operation(summary = "Undo an acknowledgement")
    @DeleteMapping("/api/tire-season/acks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void undoAcknowledge(@PathVariable UUID id) {
        service.undoAcknowledge(id);
    }

    @Operation(summary = "Deadlines of the season change")
    @GetMapping("/api/tire-season-settings")
    TireSeasonSettingsDto settings() {
        return service.settings();
    }

    @Operation(summary = "Change the deadlines", description = "Needs the loaded `version`.")
    @PutMapping("/api/tire-season-settings")
    TireSeasonSettingsDto updateSettings(@Valid @RequestBody TireSeasonSettingsRequest request) {
        return service.updateSettings(request);
    }
}
