package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;

import java.time.LocalDate;
import java.util.UUID;

/**
 * What a position of the shopping list says (FB-20) – everything edited together; its state changes
 * on its own (it goes into the history).
 *
 * @param description what, e.g. "Bremsscheiben vorne"; required
 * @param partNumber  article or part number; may be empty
 * @param quantity    how many, at least 1
 * @param recordedBy  "Erfasst von" – whom to ask; empty only for positions of the old list
 * @param orderBy     "Bestellen durch" – gets a to-do; empty = not assigned
 * @param task        the task it is for; empty = for the workshop
 * @param stockItemId the article in stock it is (13g); only the ID
 * @param supplierId  where to order it; only the ID
 * @param orderedOn   day of the order – set when it is ordered, may be corrected
 * @param expectedOn  expected delivery
 */
public record ShoppingItemDetails(
        String description,
        String partNumber,
        int quantity,
        Employee recordedBy,
        Employee orderBy,
        Task task,
        UUID stockItemId,
        UUID supplierId,
        LocalDate orderedOn,
        LocalDate expectedOn) {

    static final int DESCRIPTION_MAX = 500;
    static final int PART_NUMBER_MAX = 60;
    static final int QUANTITY_MAX = 9999;

    /** The same position with another description and quantity */
    ShoppingItemDetails withOrder(String newDescription, int newQuantity) {
        return new ShoppingItemDetails(newDescription, partNumber, newQuantity, recordedBy, orderBy, task, stockItemId, supplierId, orderedOn,
                expectedOn);
    }

    public ShoppingItemDetails {
        description = Texts.checkMaxLength(Texts.emptyToNull(description), DESCRIPTION_MAX, "Description");
        if (description == null) {
            throw new IllegalArgumentException("Description is required");
        }
        partNumber = Texts.checkMaxLength(Texts.emptyToNull(partNumber), PART_NUMBER_MAX, "Part number");
        if (quantity < 1 || quantity > QUANTITY_MAX) {
            throw new IllegalArgumentException("Quantity out of range: " + quantity);
        }
    }
}
