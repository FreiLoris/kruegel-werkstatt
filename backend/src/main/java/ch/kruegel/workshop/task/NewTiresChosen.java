package ch.kruegel.workshop.task;

import java.util.UUID;

/**
 * A task now mounts new tyres, or what to order changed (FB-25) – the shopping list adds the
 * position to order them or follows, in the same transaction. An event: the shopping list knows
 * tasks, not the other way round.
 *
 * @param dimension       may still be open
 * @param count           how many tyres
 * @param acceptedBy      who took the order – records the position and orders it (FB-24)
 * @param newlyChosen     the kind just became "Neue Reifen" – else only what to order changed
 * @param dimensionBefore what the task said before (only when not newly chosen) – a position still
 *                        showing exactly that was not touched by hand
 * @param countBefore     the same for the count
 */
public record NewTiresChosen(UUID taskId, String dimension, int count, UUID acceptedBy,
                             boolean newlyChosen, String dimensionBefore, Integer countBefore) {
}
