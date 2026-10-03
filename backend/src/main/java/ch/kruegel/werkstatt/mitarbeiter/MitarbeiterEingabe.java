package ch.kruegel.werkstatt.mitarbeiter;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Eingabe zum Anlegen und Bearbeiten (JSON vom Frontend).
 *
 * <p>Die Annotationen prüfen die Eingabe, bevor der Service sie sieht – Fehler gehen als
 * 400 mit Feldname an das Formular zurück. Die gleichen Regeln stehen nochmals in
 * {@link MitarbeiterStammdaten} und als DB-Constraint.
 *
 * @param version nur beim Bearbeiten: die Version, die das Gerät geladen hat (Optimistic Locking)
 */
public record MitarbeiterEingabe(
        @NotBlank @Size(max = 40) String name,
        @NotNull Rolle rolle,
        @NotNull @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "muss eine Farbe im Format #rrggbb sein") String farbe,
        @Past LocalDate geburtstag,
        @Schema(requiredMode = REQUIRED) @Min(0) @Max(60) int ferienanspruch,
        @Schema(requiredMode = REQUIRED) boolean alsMechanikerWaehlbar,
        @Schema(requiredMode = REQUIRED) boolean fuerAufgabenWaehlbar,
        @Schema(requiredMode = REQUIRED) boolean pinnwandSpalte,
        @Schema(description = "Nur beim Bearbeiten nötig") Long version) {

    MitarbeiterStammdaten alsStammdaten() {
        return new MitarbeiterStammdaten(name, rolle, farbe, geburtstag, ferienanspruch,
                alsMechanikerWaehlbar, fuerAufgabenWaehlbar, pinnwandSpalte);
    }
}
