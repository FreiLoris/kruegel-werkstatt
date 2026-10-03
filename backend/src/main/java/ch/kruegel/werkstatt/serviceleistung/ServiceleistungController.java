package ch.kruegel.werkstatt.serviceleistung;

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

/** REST-API für Serviceleistungen. Kein DELETE: nicht mehr angebotene werden deaktiviert. */
@RestController
@RequestMapping("/api/serviceleistungen")
@Tag(name = "Serviceleistungen")
class ServiceleistungController {

    private final ServiceleistungService service;

    ServiceleistungController(ServiceleistungService service) {
        this.service = service;
    }

    record ServiceleistungReihenfolge(@NotEmpty List<UUID> ids) {
    }

    @Operation(summary = "Alle Serviceleistungen in fester Reihenfolge (Standard: nur aktive)")
    @GetMapping
    List<ServiceleistungDto> alle(@RequestParam(defaultValue = "false") boolean inklusiveInaktive) {
        return service.alle(inklusiveInaktive);
    }

    @Operation(summary = "Serviceleistung anlegen (wird ans Ende gesetzt)")
    @ApiResponse(responseCode = "201", description = "Angelegt")
    @PostMapping
    ResponseEntity<ServiceleistungDto> anlegen(@Valid @RequestBody ServiceleistungEingabe eingabe) {
        ServiceleistungDto neu = service.anlegen(eingabe);
        return ResponseEntity.created(URI.create("/api/serviceleistungen/" + neu.id())).body(neu);
    }

    @Operation(summary = "Serviceleistung umbenennen", description = "Braucht die geladene `version` – sonst 409.")
    @PutMapping("/{id}")
    ServiceleistungDto umbenennen(@PathVariable UUID id, @Valid @RequestBody ServiceleistungEingabe eingabe) {
        return service.umbenennen(id, eingabe);
    }

    @Operation(summary = "Nicht mehr anbieten (statt löschen)")
    @PostMapping("/{id}/deaktivieren")
    ServiceleistungDto deaktivieren(@PathVariable UUID id) {
        return service.deaktivieren(id);
    }

    @Operation(summary = "Wieder anbieten")
    @PostMapping("/{id}/aktivieren")
    ServiceleistungDto aktivieren(@PathVariable UUID id) {
        return service.aktivieren(id);
    }

    @Operation(summary = "Reihenfolge setzen (erste ID = ganz oben)")
    @PutMapping("/reihenfolge")
    List<ServiceleistungDto> reihenfolge(@Valid @RequestBody ServiceleistungReihenfolge reihenfolge) {
        return service.reihenfolgeSetzen(reihenfolge.ids());
    }
}
