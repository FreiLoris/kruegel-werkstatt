package ch.kruegel.workshop.supplier;

import java.util.UUID;

/**
 * Sent in the same transaction right before a supplier is deleted: whoever refers to it (the stock
 * list) lets go of it first. An event instead of a call, because the stock package already uses this
 * one – a call back would be a cycle.
 */
public record SupplierDeleting(UUID supplierId) {
}
