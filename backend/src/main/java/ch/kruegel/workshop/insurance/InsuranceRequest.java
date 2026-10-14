package ch.kruegel.workshop.insurance;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Input for creating and editing an insurance.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record InsuranceRequest(
        @NotBlank @Size(max = Insurance.NAME_MAX) String name,
        @Size(max = Insurance.PHONE_MAX) String phone,
        @Email @Size(max = Insurance.NAME_MAX) String email,
        @Schema(description = "Only needed when editing") Long version) {
}
