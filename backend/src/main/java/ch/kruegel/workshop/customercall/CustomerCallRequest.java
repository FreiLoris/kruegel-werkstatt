package ch.kruegel.workshop.customercall;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A call to the customer, as it went (FB-16, FB-21) */
public record CustomerCallRequest(
        @NotNull CallOutcome outcome,
        @Size(max = CustomerCall.NOTE_MAX) @Schema(types = {"string", "null"}, example = "ab 17 Uhr erreichbar") String note) {
}
