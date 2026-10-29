package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST API of the reminder settings (17a). */
@RestController
@RequestMapping("/api/reminder-settings")
@Tag(name = "Reminders")
class ReminderSettingsController {

    private final ReminderSettingsService service;

    ReminderSettingsController(ReminderSettingsService service) {
        this.service = service;
    }

    @Operation(summary = "Whether and when customers are reminded of their appointments")
    @GetMapping
    ReminderSettingsDto settings() {
        return service.settings();
    }

    @Operation(summary = "Turn the reminders on or off, change the time and the wording",
            description = "Time 08:00–19:00; unknown placeholders are refused. Needs the loaded `version`.")
    @PutMapping
    ReminderSettingsDto update(@Valid @RequestBody ReminderSettingsRequest request) {
        return service.update(request);
    }

    @Operation(summary = "A wording as an example customer gets it", description = "With its length in SMS – nothing is saved.")
    @PostMapping("/preview")
    SmsPreviewDto preview(@Valid @RequestBody SmsPreviewRequest request) {
        return service.preview(request);
    }
}
