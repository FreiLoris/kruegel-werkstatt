package ch.kruegel.werkstatt.common.web;

import ch.kruegel.werkstatt.common.persistence.VeralteteVersionException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Nur für Tests: löst gezielt jede Fehlerart aus, damit {@link GlobalExceptionHandler}
 * geprüft werden kann, ohne dass es schon echte Fach-Endpoints gibt.
 */
@RestController
@RequestMapping("/test/fehler")
class FehlerTestController {

    record Eingabe(@NotBlank String name, @Size(max = 5) String kuerzel) {
    }

    @PostMapping("/validierung")
    void validierung(@Valid @RequestBody Eingabe eingabe) {
        // Erreicht nur gültige Eingaben
    }

    @GetMapping("/nicht-gefunden")
    void nichtGefunden() {
        throw new NichtGefundenException("Mitarbeiter", UUID.fromString("00000000-0000-0000-0000-000000000001"));
    }

    @GetMapping("/konflikt")
    void konflikt() {
        throw new VeralteteVersionException(1, 2);
    }

    @GetMapping("/absturz")
    void absturz() {
        throw new IllegalStateException("geheime technische Details");
    }
}
