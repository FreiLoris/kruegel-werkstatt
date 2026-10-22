package ch.kruegel.workshop.todo;

import java.util.UUID;

/**
 * The to-do ordering a shopping list position was ticked off, undone or given to someone else
 * (FB-20) – the position follows: ticked = ordered. An event, so the to-dos need not know the
 * shopping list (no package cycle). Sent within the transaction.
 *
 * @param assigneeId who has the to-do now; empty = nobody
 */
public record ShoppingTodoChanged(UUID shoppingItemId, boolean done, UUID assigneeId) {
}
