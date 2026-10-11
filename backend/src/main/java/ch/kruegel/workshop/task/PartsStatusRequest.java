package ch.kruegel.workshop.task;

import jakarta.validation.constraints.NotNull;

/** New state of the parts order of a task. */
public record PartsStatusRequest(@NotNull PartsStatus status) {
}
