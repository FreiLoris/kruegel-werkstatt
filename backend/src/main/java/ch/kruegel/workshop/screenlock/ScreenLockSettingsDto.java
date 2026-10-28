package ch.kruegel.workshop.screenlock;

import io.swagger.v3.oas.annotations.media.Schema;

/** The screen lock setting (FB-29). */
public record ScreenLockSettingsDto(
        long version,
        @Schema(description = "Minutes without use until a device asks who is at it; 0 = never", example = "5") int lockMinutes) {

    static ScreenLockSettingsDto of(ScreenLockSettings s) {
        return new ScreenLockSettingsDto(s.getVersion(), s.getLockMinutes());
    }
}
