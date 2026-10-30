package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.web.InvalidInputException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;

/**
 * The workshop's public holidays for a period – computed on every call – and which ones they are (neutral 2).
 *
 * <p>A period instead of a year: calendar views often span the turn of the year
 * (week view from Dec 29 to Jan 4).
 */
@RestController
@RequestMapping("/api/public-holidays")
@Tag(name = "Public holidays")
class PublicHolidayController {

    /** Protects against absurd requests (e.g. from=0001-01-01) */
    static final Period MAX_PERIOD = Period.ofYears(3);

    private final PublicHolidays holidays;
    private final PublicHolidaySettingsService settings;

    PublicHolidayController(PublicHolidays holidays, PublicHolidaySettingsService settings) {
        this.holidays = holidays;
        this.settings = settings;
    }

    @Operation(summary = "The workshop's public holidays from `from` to `to` (both inclusive, max. 3 years)")
    @GetMapping
    List<PublicHolidayDto> between(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // User-facing messages, hence German
        if (to.isBefore(from)) {
            throw new InvalidInputException("to", "darf nicht vor dem Startdatum liegen");
        }
        if (to.isAfter(from.plus(MAX_PERIOD))) {
            throw new InvalidInputException("to", "Zeitraum darf höchstens 3 Jahre umfassen");
        }
        return holidays.between(from, to).stream().map(PublicHolidayDto::of).toList();
    }

    @Operation(summary = "Every public holiday the app knows, the workshop's ones chosen", description = "With this year's date of each.")
    @GetMapping("/settings")
    PublicHolidaySettingsDto settings() {
        return settings.settings();
    }

    @Operation(summary = "Choose the workshop's public holidays", description = "All of them – one left out is none any more. "
            + "Needs the loaded `version`.")
    @PutMapping("/settings")
    PublicHolidaySettingsDto update(@Valid @RequestBody PublicHolidaySettingsRequest request) {
        return settings.update(request);
    }
}
