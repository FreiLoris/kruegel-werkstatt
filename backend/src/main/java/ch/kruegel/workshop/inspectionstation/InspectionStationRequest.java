package ch.kruegel.workshop.inspectionstation;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Input for creating and editing an inspection station.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record InspectionStationRequest(
        @NotBlank @Size(max = InspectionStation.NAME_MAX) String name,
        @Size(max = InspectionStation.ADDRESS_MAX) String address,
        @Size(max = InspectionStation.PHONE_MAX) String phone,
        @NotNull @Min(InspectionStation.MINUTES_MIN) @Max(InspectionStation.MINUTES_MAX)
        @Schema(description = "Trip there and back incl. the inspection") Integer minutes,
        @Schema(description = "Only needed when editing") Long version) {
}
