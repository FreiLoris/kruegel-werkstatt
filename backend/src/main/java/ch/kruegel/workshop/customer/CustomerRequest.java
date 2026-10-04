package ch.kruegel.workshop.customer;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Input for creating and editing a LOCAL customer. Empty texts count as "not set".
 * Last name or company is required – checked by {@link CustomerService} with a field error.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record CustomerRequest(
        @Size(max = CustomerDetails.MAX) String salutation,
        @Size(max = CustomerDetails.MAX) String firstName,
        @Size(max = CustomerDetails.MAX) String lastName,
        @Size(max = CustomerDetails.MAX) String company,
        @Size(max = CustomerDetails.MAX) String addition,
        @Size(max = CustomerDetails.MAX) String street,
        @Size(max = CustomerDetails.MAX) String postalCode,
        @Size(max = CustomerDetails.MAX) String city,
        @Size(max = CustomerDetails.MAX) String phone,
        @Size(max = CustomerDetails.MAX) String mobile,
        @Email @Size(max = CustomerDetails.MAX) String email,
        @Schema(description = "Only needed when editing") Long version) {

    boolean hasName() {
        return !(isBlank(lastName) && isBlank(company));
    }

    CustomerDetails toDetails() {
        return new CustomerDetails(salutation, firstName, lastName, company, addition, street, postalCode,
                city, phone, mobile, email);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
