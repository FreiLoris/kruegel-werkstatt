package ch.kruegel.workshop.task;

import java.util.UUID;

/**
 * A task now mounts new tyres, or what to order changed (FB-25) – the shopping list adds the
 * position to order them or follows, in the same transaction. An event: the shopping list knows
 * tasks, not the other way round.
 *
 * @param dimension  may still be open
 * @param count      how many tyres
 * @param acceptedBy who took the order – records the position and orders it (FB-24)
 */
public record NewTiresChosen(UUID taskId, String dimension, int count, UUID acceptedBy) {
}
