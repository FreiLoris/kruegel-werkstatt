package ch.kruegel.workshop.courtesycar;

import java.util.UUID;

/**
 * Sent in the same transaction right before a courtesy car is taken out of service: the bookings
 * may refuse it while the car is still out or promised. An event instead of a call, because the
 * booking package already uses this one – a call back would be a cycle.
 */
public record CourtesyCarDeactivating(UUID courtesyCarId, String name) {
}
