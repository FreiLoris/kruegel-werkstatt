package ch.kruegel.workshop.company;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Input for the company profile. Empty texts count as "not set". */
public record CompanyRequest(
        @NotBlank @Size(max = CompanyDetails.NAME_MAX) String name,
        @Size(max = 100) String street,
        @Size(max = 10) String postalCode,
        @Size(max = 60) String city,
        @Size(max = 30) String phone,
        @Email @Size(max = 100) String email,
        @Size(max = 100) String website,
        @NotNull @Schema(description = "The version that was loaded (optimistic locking)") Long version) {

    CompanyDetails toDetails() {
        return new CompanyDetails(name, street, postalCode, city, phone, email, website);
    }
}
