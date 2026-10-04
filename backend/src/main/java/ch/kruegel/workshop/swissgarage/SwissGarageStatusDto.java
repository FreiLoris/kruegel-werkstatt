package ch.kruegel.workshop.swissgarage;

import io.swagger.v3.oas.annotations.media.Schema;

/** How much SwissGarage data the app currently has – for the import page. */
public record SwissGarageStatusDto(
        @Schema(description = "Active customers from SwissGarage") long customers,
        @Schema(description = "Active vehicles from SwissGarage") long vehicles,
        @Schema(description = "Of these, vehicles whose holder is not among the imported customers") long vehiclesWithoutHolder) {
}
