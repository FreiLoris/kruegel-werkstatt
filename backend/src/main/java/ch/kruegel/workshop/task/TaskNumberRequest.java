package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** The task number (the app gives one to every task) – can be changed, not removed. */
public record TaskNumberRequest(
        @Size(max = Task.TASK_NUMBER_MAX) @Schema(types = {"string", "null"}) String taskNumber) {
}
