package ch.kruegel.workshop.customer;

import jakarta.validation.constraints.NotNull;

/** 17a: true = the customer wants no reminders of appointments. No version: a mark of its own, like a status. */
public record NoRemindersRequest(@NotNull Boolean noReminders) {
}
