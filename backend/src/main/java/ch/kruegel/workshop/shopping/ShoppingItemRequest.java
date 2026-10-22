package ch.kruegel.workshop.shopping;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Input for a position of the shopping list (FB-20). The quick entry – on the list and on the task
 * (FB-19) – sends the first six; the rest is added on the position's page.
 *
 * @param orderById "Bestellen durch": gets a to-do; empty = not assigned
 * @param version   only when editing
 */
public record ShoppingItemRequest(
        @NotBlank @Size(max = ShoppingItemDetails.DESCRIPTION_MAX) @Schema(example = "Bremsscheiben vorne") String description,
        @Size(max = ShoppingItemDetails.PART_NUMBER_MAX) @Schema(types = {"string", "null"}, example = "0986479S27") String partNumber,
        @Min(1) @Max(ShoppingItemDetails.QUANTITY_MAX) @Schema(description = "Missing = 1") Integer quantity,
        @Schema(description = "Missing = to order when new, unchanged when editing") ShoppingStatus status,
        @NotNull @Schema(description = "Erfasst von – whom to ask") UUID recordedById,
        @Schema(types = {"string", "null"}, format = "uuid") UUID orderById,
        @Schema(types = {"string", "null"}, format = "uuid", description = "The task it is for; empty = for the workshop") UUID taskId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID stockItemId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID supplierId,
        @Schema(types = {"string", "null"}, format = "date", description = "Empty = the day it is set to ordered") LocalDate orderedOn,
        @Schema(types = {"string", "null"}, format = "date") LocalDate expectedOn,
        @Schema(description = "Only needed when editing") Long version) {

    public ShoppingItemRequest {
        quantity = quantity == null ? 1 : quantity;
    }
}
