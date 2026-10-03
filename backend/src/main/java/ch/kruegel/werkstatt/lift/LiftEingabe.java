package ch.kruegel.werkstatt.lift;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Eingabe zum Anlegen und Umbenennen.
 *
 * @param version nur beim Bearbeiten: die Version, die das Gerät geladen hat (Optimistic Locking)
 */
public record LiftEingabe(
        @NotBlank @Size(max = Lift.NAME_MAX) String name,
        @Schema(description = "Nur beim Bearbeiten nötig") Long version) {
}
