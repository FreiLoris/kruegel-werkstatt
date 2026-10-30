package ch.kruegel.workshop.appmodule;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The parts of the app the workshop does not use – every other one is on. */
public record ModuleSettingsRequest(
        @NotNull @Size(max = 20) @Schema(example = "[\"TIRE_HOTEL\"]") List<@NotNull AppModule> off,
        @NotNull Long version) {
}
