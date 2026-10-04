package ch.kruegel.workshop.lift;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * A lift (vehicle hoist). Appointments are assigned to a lift; in the day view and on
 * the dashboard every active lift has its own column.
 *
 * <p>Decommissioned lifts are {@linkplain #deactivate() deactivated}, not deleted –
 * old tasks still refer to them.
 */
@Entity
public class Lift extends BaseEntity implements Sortable {

    static final int NAME_MAX = 30;

    @Column(nullable = false)
    private String name;

    private boolean active;

    private int sortOrder;

    protected Lift() {
        // for JPA
    }

    public Lift(String name, int sortOrder) {
        rename(name);
        this.active = true;
        this.sortOrder = sortOrder;
    }

    /** Surrounding whitespace is removed; 1–30 characters. */
    public void rename(String newName) {
        String cleaned = newName == null ? "" : newName.strip();
        if (cleaned.isEmpty() || cleaned.length() > NAME_MAX) {
            throw new IllegalArgumentException("Name must be 1–" + NAME_MAX + " characters: '" + cleaned + "'");
        }
        this.name = cleaned;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    @Override
    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
