package ch.kruegel.workshop.booking;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/** The car is back; empty = now. */
public record ReturnRequest(
        @Schema(types = {"string", "null"}, example = "2026-10-15T16:30", description = "Empty = now") LocalDateTime returnedAt) {
}
