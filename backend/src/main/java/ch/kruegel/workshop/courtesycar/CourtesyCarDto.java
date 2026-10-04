package ch.kruegel.workshop.courtesycar;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A courtesy car as delivered by the API, including the computed due status of
 * service and insurance (relative to today).
 */
public record CourtesyCarDto(
        UUID id,
        long version,
        String name,
        @Schema(types = {"string", "null"}) String model,
        @Schema(types = {"string", "null"}) String licensePlate,
        @Schema(types = {"string", "null"}, format = "date") LocalDate serviceDue,
        @Schema(types = {"string", "null"}, description = "Empty if no service date is set") DueStatus serviceStatus,
        @Schema(types = {"string", "null"}, format = "date") LocalDate insuranceUntil,
        @Schema(types = {"string", "null"}, description = "Empty if no insurance date is set") DueStatus insuranceStatus,
        boolean active,
        int sortOrder,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: sample data)") UUID updatedBy) {

    static CourtesyCarDto of(CourtesyCar car, LocalDate today) {
        return new CourtesyCarDto(car.getId(), car.getVersion(), car.getName(), car.getModel(), car.getLicensePlate(),
                car.getServiceDue(), DueStatus.of(car.getServiceDue(), today),
                car.getInsuranceUntil(), DueStatus.of(car.getInsuranceUntil(), today),
                car.isActive(), car.getSortOrder(), car.getUpdatedAt(), car.getUpdatedBy());
    }
}
