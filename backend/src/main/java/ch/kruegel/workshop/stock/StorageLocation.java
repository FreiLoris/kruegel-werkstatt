package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Where something lies in the workshop (shelf, compartment, …), named freely in the settings.
 *
 * <p>One no longer used is {@linkplain #deactivate() deactivated}, not deleted – articles may still
 * refer to it.
 */
@Entity
public class StorageLocation extends BaseEntity implements Sortable {

    static final int NAME_MAX = 40;

    @Column(nullable = false)
    private String name;

    private boolean active;

    private int sortOrder;

    protected StorageLocation() {
        // for JPA
    }

    public StorageLocation(String name, int sortOrder) {
        rename(name);
        this.active = true;
        this.sortOrder = sortOrder;
    }

    /** Surrounding whitespace is removed; 1–40 characters. */
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
