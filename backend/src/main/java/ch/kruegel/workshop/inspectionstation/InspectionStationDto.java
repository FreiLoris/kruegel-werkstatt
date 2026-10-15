package ch.kruegel.workshop.inspectionstation;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** An inspection station as delivered by the API. */
public record InspectionStationDto(
        UUID id,
        long version,
        String name,
        @Schema(types = {"string", "null"}) String address,
        @Schema(types = {"string", "null"}) String phone,
        @Schema(description = "Trip there and back incl. the inspection – preset as the duration of the MFK appointment") int minutes,
        @Schema(description = "Preset on a new task – exactly one") boolean standard,
        boolean active,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static InspectionStationDto of(InspectionStation s) {
        return new InspectionStationDto(s.getId(), s.getVersion(), s.getName(), s.getAddress(), s.getPhone(), s.getMinutes(),
                s.isStandard(), s.isActive(), s.getUpdatedAt(), s.getUpdatedBy());
    }
}
