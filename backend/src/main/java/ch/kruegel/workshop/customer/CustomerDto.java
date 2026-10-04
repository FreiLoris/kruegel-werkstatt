package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.common.RecordSource;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** A customer as delivered by the API. */
public record CustomerDto(
        UUID id,
        long version,
        RecordSource source,
        @Schema(types = {"string", "null"}, description = "SwissGarage address number (only for source SWISSGARAGE)") String swissgarageNumber,
        @Schema(description = "\"Muster AG\", \"Huber Peter\" or \"Muster AG (Huber Peter)\"") String displayName,
        @Schema(types = {"string", "null"}) String salutation,
        @Schema(types = {"string", "null"}) String firstName,
        @Schema(types = {"string", "null"}) String lastName,
        @Schema(types = {"string", "null"}) String company,
        @Schema(types = {"string", "null"}) String addition,
        @Schema(types = {"string", "null"}) String street,
        @Schema(types = {"string", "null"}) String postalCode,
        @Schema(types = {"string", "null"}) String city,
        @Schema(types = {"string", "null"}) String phone,
        @Schema(types = {"string", "null"}) String mobile,
        @Schema(types = {"string", "null"}) String email,
        @Schema(description = "False for SwissGarage customers – they are changed in SwissGarage") boolean editable,
        boolean active,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: import/sample data)") UUID updatedBy) {

    static CustomerDto of(Customer c) {
        CustomerDetails d = c.getDetails();
        return new CustomerDto(c.getId(), c.getVersion(), c.getSource(), c.getSwissgarageNumber(), d.displayName(),
                d.salutation(), d.firstName(), d.lastName(), d.company(), d.addition(), d.street(), d.postalCode(),
                d.city(), d.phone(), d.mobile(), d.email(), !c.isFromSwissGarage(), c.isActive(),
                c.getUpdatedAt(), c.getUpdatedBy());
    }
}
