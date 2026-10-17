package ch.kruegel.workshop.company;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Input for the company profile. Empty texts count as "not set". */
public record CompanyRequest(
        @NotBlank @Size(max = CompanyDetails.NAME_MAX) String name,
        @Size(max = CompanyDetails.STREET_MAX) String street,
        @Size(max = CompanyDetails.POSTAL_CODE_MAX) String postalCode,
        @Size(max = CompanyDetails.CITY_MAX) String city,
        @Size(max = CompanyDetails.PHONE_MAX) String phone,
        @Email @Size(max = CompanyDetails.EMAIL_MAX) String email,
        @Size(max = CompanyDetails.WEBSITE_MAX) String website,
        @NotNull @Schema(description = "The version that was loaded (optimistic locking)") Long version) {

    CompanyDetails toDetails() {
        return new CompanyDetails(name, street, postalCode, city, phone, email, website);
    }
}
