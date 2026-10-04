package ch.kruegel.workshop.common.persistence;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sets a new order – the same for every {@link Sortable} entity:
 * the given IDs move to the front in that order, all others follow in their previous order.
 * Afterwards the positions are gapless 0, 1, 2, …
 *
 * <p>That way the frontend can send only the active ones – the inactive ones slide to the end.
 */
public final class SortOrder {

    private SortOrder() {
    }

    /**
     * @param current  all entries in their current order
     * @param ids      desired order (first ID = top)
     * @param what     German display name for error messages, e.g. "Lift"
     * @throws InvalidInputException if an ID occurs twice
     * @throws NotFoundException     if an ID is unknown
     */
    public static <T extends Sortable> void reorder(List<T> current, List<UUID> ids, String what) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new InvalidInputException("ids", "enthält denselben Eintrag mehrfach");
        }
        Map<UUID, T> remaining = new LinkedHashMap<>();
        current.forEach(entry -> remaining.put(entry.getId(), entry));

        List<T> reordered = new ArrayList<>();
        for (UUID id : ids) {
            T entry = remaining.remove(id);
            if (entry == null) {
                throw new NotFoundException(what, id);
            }
            reordered.add(entry);
        }
        reordered.addAll(remaining.values());

        for (int i = 0; i < reordered.size(); i++) {
            reordered.get(i).moveTo(i);
        }
    }
}
