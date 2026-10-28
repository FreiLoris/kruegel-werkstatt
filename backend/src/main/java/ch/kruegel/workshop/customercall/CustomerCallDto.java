package ch.kruegel.workshop.customercall;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A call to the customer: how it went, when and by whom */
public record CustomerCallDto(
        UUID id,
        UUID customerId,
        CallOutcome outcome,
        @Schema(types = {"string", "null"}) String note,
        Instant calledAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who called") UUID calledBy) {

    static CustomerCallDto of(CustomerCall call) {
        // getId() on a LAZY reference does not load it
        return new CustomerCallDto(call.getId(), call.getCustomer().getId(), call.getOutcome(), call.getNote(), call.getCreatedAt(),
                call.getCreatedBy());
    }
}
