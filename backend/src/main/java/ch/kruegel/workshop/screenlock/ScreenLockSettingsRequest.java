package ch.kruegel.workshop.screenlock;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** New minutes for the screen lock; 0 = never. */
public record ScreenLockSettingsRequest(
        @NotNull @Min(0) @Max(ScreenLockSettings.MAX_MINUTES) @Schema(example = "5") Integer lockMinutes,
        @NotNull Long version) {
}
