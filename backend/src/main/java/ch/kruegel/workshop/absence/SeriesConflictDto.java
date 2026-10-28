package ch.kruegel.workshop.absence;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

/** A day a series leaves out because something else is entered then – "bereits als Ferien eingetragen" (FB-33) */
public record SeriesConflictDto(@Schema(format = "date") LocalDate day, String reason) {
}
