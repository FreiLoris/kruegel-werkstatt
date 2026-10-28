package ch.kruegel.workshop.screenlock;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST API of the screen lock setting (FB-29). */
@RestController
@RequestMapping("/api/screen-lock-settings")
@Tag(name = "Screen lock")
class ScreenLockController {

    private final ScreenLockService service;

    ScreenLockController(ScreenLockService service) {
        this.service = service;
    }

    @Operation(summary = "After how many minutes without use a device asks who is at it", description = "0 = never. "
            + "Devices \"only looking\" (the workshop TV) never ask.")
    @GetMapping
    ScreenLockSettingsDto settings() {
        return service.settings();
    }

    @Operation(summary = "Change the minutes", description = "0–120, 0 = never. Needs the loaded `version`.")
    @PutMapping
    ScreenLockSettingsDto update(@Valid @RequestBody ScreenLockSettingsRequest request) {
        return service.update(request);
    }
}
