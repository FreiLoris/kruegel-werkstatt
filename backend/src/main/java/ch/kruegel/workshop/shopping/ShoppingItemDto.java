package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.TaskRefDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A position of the shopping list as delivered by the API. Persons only as ID – the frontend has the list. */
public record ShoppingItemDto(
        UUID id,
        long version,
        String description,
        @Schema(types = {"string", "null"}) String partNumber,
        int quantity,
        ShoppingStatus status,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Erfasst von; empty only for old positions") UUID recordedById,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Bestellen durch; empty = not assigned") UUID orderById,
        @Schema(types = {"object", "null"}, description = "The task it is for – enough to name it and open it") TaskRefDto task,
        @Schema(types = {"string", "null"}, format = "uuid") UUID stockItemId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID supplierId,
        @Schema(types = {"string", "null"}, format = "date") LocalDate orderedOn,
        @Schema(types = {"string", "null"}, format = "date") LocalDate expectedOn,
        @Schema(types = {"string", "null"}, format = "date") LocalDate arrivedOn,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID createdBy) {

    static ShoppingItemDto of(ShoppingItem item) {
        ShoppingItemDetails d = item.getDetails();
        return new ShoppingItemDto(item.getId(), item.getVersion(), d.description(), d.partNumber(), d.quantity(), item.getStatus(),
                idOf(d.recordedBy()), idOf(d.orderBy()), TaskRefDto.of(d.task()), d.stockItemId(), d.supplierId(), d.orderedOn(),
                d.expectedOn(), item.getArrivedOn(), item.getCreatedAt(), item.getCreatedBy());
    }

    // getId() on a LAZY reference does not load it
    private static UUID idOf(Employee employee) {
        return employee == null ? null : employee.getId();
    }
}
