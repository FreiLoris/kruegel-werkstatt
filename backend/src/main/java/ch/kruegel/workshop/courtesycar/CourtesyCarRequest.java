package ch.kruegel.workshop.courtesycar;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Input for creating and editing (JSON from the frontend). Empty texts count as "not set".
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record CourtesyCarRequest(
        @NotBlank @Size(max = CourtesyCarDetails.NAME_MAX) String name,
        @Size(max = CourtesyCarDetails.MODEL_MAX) String model,
        @Size(max = CourtesyCarDetails.LICENSE_PLATE_MAX) String licensePlate,
        LocalDate serviceDue,
        LocalDate insuranceUntil,
        @Schema(description = "Only needed when editing") Long version) {

    CourtesyCarDetails toDetails() {
        return new CourtesyCarDetails(name, model, licensePlate, serviceDue, insuranceUntil);
    }
}
