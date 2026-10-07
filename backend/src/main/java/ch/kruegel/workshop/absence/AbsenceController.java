package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** REST API for absences of employees (vacation, sick, external work, training). */
@RestController
@RequestMapping("/api/absences")
@Tag(name = "Absences")
class AbsenceController {

    private final AbsenceService service;
    private final AbsenceStatisticsService statistics;

    AbsenceController(AbsenceService service, AbsenceStatisticsService statistics) {
        this.service = service;
        this.statistics = statistics;
    }

    @Operation(summary = "Absences touching the days `from`–`to`", description = "Both inclusive, max. "
            + AbsenceService.MAX_DAYS + " days; `employeeId`: only this person's.")
    @GetMapping
    List<AbsenceDto> between(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                             @RequestParam(required = false) UUID employeeId) {
        return service.between(from, to, employeeId);
    }

    @Operation(summary = "Absences of a year counted", description = "In working days (Mon–Fri without public holidays), "
            + "half days as 0.5: vacation taken/planned/left per person, sick, training, external work – and per company.")
    @GetMapping("/statistics")
    AbsenceStatisticsDto statistics(@RequestParam int year) {
        return statistics.forYear(year);
    }

    @Operation(summary = "Enter absence", description = "Not overlapping another absence of the person (to the half day).")
    @ApiResponse(responseCode = "201", description = "Created")
    @PostMapping
    ResponseEntity<AbsenceDto> create(@Valid @RequestBody AbsenceRequest request) {
        AbsenceDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/absences/" + created.id())).body(created);
    }

    @Operation(summary = "Change absence", description = "Needs the loaded `version` (409 if someone else changed it).")
    @PutMapping("/{id}")
    AbsenceDto update(@PathVariable UUID id, @Valid @RequestBody AbsenceRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Delete absence")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
