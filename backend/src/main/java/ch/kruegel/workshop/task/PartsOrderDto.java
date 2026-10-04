package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/** Parts order of a task as delivered by the API. */
public record PartsOrderDto(
        String description,
        PartsStatus status,
        @Schema(types = {"string", "null"}) String supplier,
        @Schema(types = {"string", "null"}, format = "date") LocalDate orderedOn) {

    static PartsOrderDto of(PartsOrder parts) {
        return parts == null ? null : new PartsOrderDto(parts.description(), parts.status(), parts.supplier(), parts.orderedOn());
    }
}
