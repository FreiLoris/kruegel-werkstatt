package ch.kruegel.workshop.stock;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Input for creating and renaming.
 *
 * @param parentId only when creating: the place it is in; empty = top level (moving has its own endpoint)
 * @param version  only when editing: the version the device loaded (optimistic locking)
 */
public record StorageLocationRequest(
        @NotBlank @Size(max = StorageLocation.NAME_MAX) String name,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Only when creating; empty = top level") UUID parentId,
        @Schema(description = "Only needed when editing") Long version) {
}
