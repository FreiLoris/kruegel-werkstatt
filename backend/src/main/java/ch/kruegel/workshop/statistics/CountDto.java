package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

/** One bar of a ranking or a chart: what was counted and how often. */
public record CountDto(
        @Schema(description = "A name, a fixed value (e.g. a status), a month \"2026-10\", an hour \"07\" or a date") String label,
        long count) {
}
