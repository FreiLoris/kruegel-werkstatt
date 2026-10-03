package ch.kruegel.werkstatt.lift;

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

/** REST-API für Lifts. Kein DELETE: stillgelegte Lifts werden deaktiviert. */
@RestController
@RequestMapping("/api/lifts")
@Tag(name = "Lifts")
class LiftController {

    private final LiftService service;

    LiftController(LiftService service) {
        this.service = service;
    }

    record LiftReihenfolge(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "Alle Lifts in fester Reihenfolge (Standard: nur aktive)")
    @GetMapping
    List<LiftDto> alle(@RequestParam(defaultValue = "false") boolean inklusiveInaktive) {
        return service.alle(inklusiveInaktive);
    }

    @Operation(summary = "Lift anlegen (wird ans Ende gesetzt)")
    @ApiResponse(responseCode = "201", description = "Angelegt")
    @PostMapping
    ResponseEntity<LiftDto> anlegen(@Valid @RequestBody LiftEingabe eingabe) {
        LiftDto neu = service.anlegen(eingabe);
        return ResponseEntity.created(URI.create("/api/lifts/" + neu.id())).body(neu);
    }

    @Operation(summary = "Lift umbenennen", description = "Braucht die geladene `version` – sonst 409.")
    @PutMapping("/{id}")
    LiftDto umbenennen(@PathVariable UUID id, @Valid @RequestBody LiftEingabe eingabe) {
        return service.umbenennen(id, eingabe);
    }

    @Operation(summary = "Stilllegen (statt löschen) – der letzte aktive Lift bleibt")
    @PostMapping("/{id}/deaktivieren")
    LiftDto deaktivieren(@PathVariable UUID id) {
        return service.deaktivieren(id);
    }

    @Operation(summary = "Wieder in Betrieb nehmen")
    @PostMapping("/{id}/aktivieren")
    LiftDto aktivieren(@PathVariable UUID id) {
        return service.aktivieren(id);
    }

    @Operation(summary = "Reihenfolge setzen (erste ID = ganz links)")
    @PutMapping("/reihenfolge")
    List<LiftDto> reihenfolge(@Valid @RequestBody LiftReihenfolge reihenfolge) {
        return service.reihenfolgeSetzen(reihenfolge.ids());
    }
}
