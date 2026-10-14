package ch.kruegel.workshop.insurance;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** An insurance as delivered by the API. */
public record InsuranceDto(
        UUID id,
        long version,
        String name,
        @Schema(types = {"string", "null"}) String phone,
        @Schema(types = {"string", "null"}) String email,
        boolean active,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static InsuranceDto of(Insurance i) {
        return new InsuranceDto(i.getId(), i.getVersion(), i.getName(), i.getPhone(), i.getEmail(), i.isActive(),
                i.getUpdatedAt(), i.getUpdatedBy());
    }
}
