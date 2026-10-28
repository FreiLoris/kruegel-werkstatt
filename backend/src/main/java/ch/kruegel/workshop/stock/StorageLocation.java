package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import org.hibernate.annotations.OptimisticLock;

import java.util.Locale;
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
    /** FB-23: two capitals and two digits, e.g. KA01 */
    static final String CODE_PATTERN = "^[A-Z]{2}[0-9]{2}$";

    @Column(nullable = false)
    private String name;

    private boolean active;

    // the order is no edit of the entry: reordering must not make an open edit dialog conflict
    @OptimisticLock(excluded = true)
    private int sortOrder;

    /** The place it is in; empty = top level. Only the ID – the tree is put together by the page. */
    private UUID parentId;

    /**
     * Not in use: the place whose clearing out took it along (itself if cleared out on its own) –
     * using that place again brings back exactly these, not one cleared out before on its own.
     * Empty for the ones cleared out before V38 (they come back with their place, as they did then).
     */
    private UUID deactivatedWith;

    /** What is written on the shelf (FB-23), e.g. "KA01" – empty = the code of the place above counts */
    private String code;

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

    /** As stored: upper case, without surrounding spaces; null when empty */
    static String normalizeCode(String code) {
        String cleaned = code == null ? "" : code.strip().toUpperCase(Locale.ROOT);
        return cleaned.isEmpty() ? null : cleaned;
    }

    /**
     * What is written on the shelf (FB-23); empty = none. Unique on the premises (the service checks
     * it, the database too).
     */
    public void changeCode(String newCode) {
        String cleaned = normalizeCode(newCode);
        if (cleaned != null && !cleaned.matches(CODE_PATTERN)) {
            throw new IllegalArgumentException("Code must be like KA01: '" + cleaned + "'");
        }
        this.code = cleaned;
    }

    /** @param with the place being cleared out – this one or one it lies in */
    public void deactivate(UUID with) {
        this.active = false;
        this.deactivatedWith = with;
    }

    public void activate() {
        this.active = true;
        this.deactivatedWith = null;
    }

    /** Was it cleared out together with {@code place} (or before V38, when that was not recorded)? */
    public boolean deactivatedWith(UUID place) {
        return !active && (deactivatedWith == null || deactivatedWith.equals(place));
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

    public String getCode() {
        return code;
    }
}
