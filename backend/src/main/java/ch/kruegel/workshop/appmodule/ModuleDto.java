package ch.kruegel.workshop.appmodule;

import io.swagger.v3.oas.annotations.media.Schema;

/** One part of the app and whether the workshop uses it (neutral 3). */
public record ModuleDto(
        AppModule module,
        @Schema(example = "Pneuhotel") String title,
        @Schema(example = "Eingelagerte Räder, Saisonwechsel, Etiketten") String description,
        boolean on) {
}
