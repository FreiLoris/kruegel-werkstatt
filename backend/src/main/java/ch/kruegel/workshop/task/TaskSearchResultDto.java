package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Result of the appointment search. */
public record TaskSearchResultDto(
        @Schema(description = "Orders without appointment first, then upcoming appointments (nearest first), then past ones (newest first)") List<TaskDto> hits,
        @Schema(description = "True if there are more hits than delivered") boolean more) {
}
