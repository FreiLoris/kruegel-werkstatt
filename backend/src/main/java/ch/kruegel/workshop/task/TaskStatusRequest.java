package ch.kruegel.workshop.task;

import jakarta.validation.constraints.NotNull;

/** New status of a task. */
public record TaskStatusRequest(@NotNull TaskStatus status) {
}
