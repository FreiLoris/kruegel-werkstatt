package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** SwissGarage order number of a task; empty removes it. */
public record TaskNumberRequest(
        @Size(max = Task.TASK_NUMBER_MAX) @Schema(types = {"string", "null"}) String taskNumber) {
}
