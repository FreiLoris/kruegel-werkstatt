package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.web.InvalidInputException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;

/**
 * Public holidays of the canton of Zurich for a period – read only, computed on every call.
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

    private final ZurichPublicHolidays holidays;

    PublicHolidayController(ZurichPublicHolidays holidays) {
        this.holidays = holidays;
    }

    @Operation(summary = "Public holidays of the canton of Zurich from `from` to `to` (both inclusive, max. 3 years)")
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
}
