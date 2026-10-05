package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.task.TaskDto;

/** The task created by the wizard and its courtesy car booking. */
public record TaskWithBookingDto(TaskDto task, BookingDto booking) {
}
