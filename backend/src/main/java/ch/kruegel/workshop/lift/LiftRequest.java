package ch.kruegel.workshop.lift;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Input for creating and renaming.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record LiftRequest(
        @NotBlank @Size(max = Lift.NAME_MAX) String name,
        @Schema(description = "Only needed when editing") Long version) {
}
