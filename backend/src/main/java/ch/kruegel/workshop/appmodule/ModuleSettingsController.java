package ch.kruegel.workshop.appmodule;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST API of the parts of the app the workshop uses (neutral 3). */
@RestController
@RequestMapping("/api/modules")
@Tag(name = "Modules")
class ModuleSettingsController {

    private final ModuleSettingsService service;

    ModuleSettingsController(ModuleSettingsService service) {
        this.service = service;
    }

    @Operation(summary = "The parts of the app and which ones the workshop uses", description = "Read by every device "
            + "for its menu. All on until switched off.")
    @GetMapping
    ModuleSettingsDto settings() {
        return service.settings();
    }

    @Operation(summary = "Switch parts of the app off or on", description = "The ones off – every other one is on. "
            + "Only hides them; their data stays. Needs the loaded `version`.")
    @PutMapping
    ModuleSettingsDto update(@Valid @RequestBody ModuleSettingsRequest request) {
        return service.update(request);
    }
}
