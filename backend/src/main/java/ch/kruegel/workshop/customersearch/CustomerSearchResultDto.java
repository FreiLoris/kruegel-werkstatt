package ch.kruegel.workshop.customersearch;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Result of the customer search. */
public record CustomerSearchResultDto(
        @Schema(description = "Customers by name, then vehicles without holder") List<CustomerSearchHitDto> hits,
        @Schema(description = "True if there are more hits than delivered – the user should type more") boolean more) {
}
