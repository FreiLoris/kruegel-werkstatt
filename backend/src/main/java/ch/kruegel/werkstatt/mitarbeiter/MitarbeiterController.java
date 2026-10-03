package ch.kruegel.werkstatt.mitarbeiter;

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
 * REST-API für Mitarbeiter. Nur HTTP – die Logik steckt im {@link MitarbeiterService}.
 *
 * <p>Kein DELETE: Ehemalige werden deaktiviert, damit alte Aufträge ihren Namen behalten.
 */
@RestController
@RequestMapping("/api/mitarbeiter")
@Tag(name = "Mitarbeiter")
class MitarbeiterController {

    private final MitarbeiterService service;

    MitarbeiterController(MitarbeiterService service) {
        this.service = service;
    }

    record Reihenfolge(@NotEmpty List<UUID> ids) {
    }

    /** Standard: nur aktive (für Auswahlfelder). Die Verwaltung holt mit {@code inklusiveInaktive=true} alle. */
    @Operation(summary = "Alle Mitarbeiter in fester Reihenfolge")
    @GetMapping
    List<MitarbeiterDto> alle(@RequestParam(defaultValue = "false") boolean inklusiveInaktive) {
        return service.alle(inklusiveInaktive);
    }

    @Operation(summary = "Einzelner Mitarbeiter")
    @GetMapping("/{id}")
    MitarbeiterDto laden(@PathVariable UUID id) {
        return service.laden(id);
    }

    @Operation(summary = "Mitarbeiter anlegen (wird ans Ende der Reihenfolge gesetzt)")
    @ApiResponse(responseCode = "201", description = "Angelegt")
    @PostMapping
    ResponseEntity<MitarbeiterDto> anlegen(@Valid @RequestBody MitarbeiterEingabe eingabe) {
        MitarbeiterDto neu = service.anlegen(eingabe);
        return ResponseEntity.created(URI.create("/api/mitarbeiter/" + neu.id())).body(neu);
    }

    @Operation(summary = "Mitarbeiter bearbeiten", description = "Braucht die geladene `version` – sonst 409, falls inzwischen geändert.")
    @PutMapping("/{id}")
    MitarbeiterDto aendern(@PathVariable UUID id, @Valid @RequestBody MitarbeiterEingabe eingabe) {
        return service.aendern(id, eingabe);
    }

    @Operation(summary = "Deaktivieren (statt löschen)")
    @PostMapping("/{id}/deaktivieren")
    MitarbeiterDto deaktivieren(@PathVariable UUID id) {
        return service.deaktivieren(id);
    }

    @Operation(summary = "Wieder aktivieren")
    @PostMapping("/{id}/aktivieren")
    MitarbeiterDto aktivieren(@PathVariable UUID id) {
        return service.aktivieren(id);
    }

    @Operation(summary = "Reihenfolge setzen (erste ID = ganz vorne)")
    @PutMapping("/reihenfolge")
    List<MitarbeiterDto> reihenfolge(@Valid @RequestBody Reihenfolge reihenfolge) {
        return service.reihenfolgeSetzen(reihenfolge.ids());
    }
}
