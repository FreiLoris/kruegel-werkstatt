package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.util.UUID;

/**
 * Where something lies in the workshop, named freely in the settings – a tree as deep as needed
 * (13f): floor or room › shelf › drawer. An article may lie at any level.
 *
 * <p>One no longer used is {@linkplain #deactivate() deactivated}, not deleted – articles may still
 * refer to it. The order ({@code sortOrder}) is among the places with the same parent.
 */
@Entity
public class StorageLocation extends BaseEntity implements Sortable {

    static final int NAME_MAX = 40;

    @Column(nullable = false)
    private String name;

    private boolean active;

    private int sortOrder;

    /** The place it is in; empty = top level. Only the ID – the tree is put together by the page. */
    private UUID parentId;

    protected StorageLocation() {
        // for JPA
    }

    public StorageLocation(String name, UUID parentId, int sortOrder) {
        rename(name);
        this.active = true;
        this.parentId = parentId;
        this.sortOrder = sortOrder;
    }

    /** Into another place (or to the top level), at the given position there. */
    public void moveUnder(UUID newParentId, int sortOrder) {
        if (getId() != null && getId().equals(newParentId)) {
            throw new IllegalArgumentException("A storage location cannot be inside itself");
        }
        this.parentId = newParentId;
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

    public UUID getParentId() {
        return parentId;
    }
}
