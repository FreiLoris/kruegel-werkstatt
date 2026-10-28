package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * A position of the shopping list (FB-20, FB-19): a part for a task, or coffee for the workshop.
 * Its state goes to be ordered → ordered → arrived; every change and every note goes into its
 * {@linkplain #getEntries() history}, so all that was found out about a part is in one place.
 */
@Entity
public class ShoppingItem extends BaseEntity {

    @Column(nullable = false)
    private String description;

    private String partNumber;

    private int quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShoppingStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    private Employee recordedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    private Employee orderBy;

    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    private UUID stockItemId;
    private UUID supplierId;
    private LocalDate orderedOn;
    private LocalDate expectedOn;

    /** When it arrived – only with {@link ShoppingStatus#ARRIVED}; the list "Erledigt" is sorted by it */
    private LocalDate arrivedOn;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    // id last: a note and a change of one save can have the same time – UUIDv7 keeps their order
    @OrderBy("createdAt, id")
    private List<ShoppingEntry> entries = new ArrayList<>();

    protected ShoppingItem() {
        // for JPA
    }

    /** New on the list; a state other than "to order" is kept in the history right away. */
    public ShoppingItem(ShoppingItemDetails details, ShoppingStatus status, LocalDate today) {
        this.status = ShoppingStatus.TO_ORDER;
        update(details, status, today);
    }

    /**
     * New data and maybe another state ({@code null} = unchanged). The day of order is kept only once it
     * is ordered: one entered counts, without one the day it was set to ordered.
     */
    public void update(ShoppingItemDetails details, ShoppingStatus newStatus, LocalDate today) {
        apply(details);
        if (newStatus != null) {
            changeStatus(newStatus, today);
        }
        if (status.isBeforeOrder()) {
            orderedOn = null;
        } else if (details.orderedOn() != null && (status != ShoppingStatus.CANCELLED || orderedOn != null)) {
            // cancelled keeps a day of order it had – it does not get one it never had
            orderedOn = details.orderedOn();
        }
    }

    /**
     * Ordered, arrived – or back. Ordered remembers the day (unless one is entered); back to a state
     * before the order forgets it, cancelled keeps it. Kept in the history.
     *
     * @return false when it already was in that state
     */
    public boolean changeStatus(ShoppingStatus newStatus, LocalDate today) {
        Objects.requireNonNull(newStatus, "status");
        if (newStatus == status) {
            return false;
        }
        switch (newStatus) {
            case TO_ORDER, QUOTE_REQUESTED, INFO_NEEDED, QUOTE_RECEIVED -> {
                orderedOn = null;
                arrivedOn = null;
            }
            case ORDERED -> {
                orderedOn = orderedOn == null ? today : orderedOn;
                arrivedOn = null;
            }
            case ARRIVED -> arrivedOn = today;
            case CANCELLED -> arrivedOn = null;
        }
        status = newStatus;
        entries.add(ShoppingEntry.status(this, newStatus));
        return true;
    }

    /**
     * Where we were up last – what undoing the to-do goes back to (FB-28): a Rückfrage ticked off is a
     * Rückfrage again, an ordered quote a quote again; "to order" when we never were anywhere else.
     */
    public ShoppingStatus lastOurTurn() {
        for (ShoppingEntry entry : entries.reversed()) {
            if (entry.getKind() == ShoppingEntry.Kind.STATUS && entry.getStatus().isOurTurn()) {
                return entry.getStatus();
            }
        }
        return ShoppingStatus.TO_ORDER;
    }

    /** Someone else orders it – the to-do was given to them (FB-20); empty = nobody */
    public void reassign(Employee orderBy) {
        this.orderBy = orderBy;
    }

    /** A note in its history – e.g. what the supplier said */
    public void addNote(String text) {
        String note = Texts.checkMaxLength(Texts.emptyToNull(text), ShoppingEntry.TEXT_MAX, "Note");
        if (note == null) {
            throw new IllegalArgumentException("Note is empty");
        }
        entries.add(ShoppingEntry.note(this, note));
    }

    private void apply(ShoppingItemDetails details) {
        this.description = details.description();
        this.partNumber = details.partNumber();
        this.quantity = details.quantity();
        this.recordedBy = details.recordedBy();
        this.orderBy = details.orderBy();
        this.task = details.task();
        this.stockItemId = details.stockItemId();
        this.supplierId = details.supplierId();
        this.expectedOn = details.expectedOn();
    }

    public ShoppingItemDetails getDetails() {
        return new ShoppingItemDetails(description, partNumber, quantity, recordedBy, orderBy, task, stockItemId, supplierId, orderedOn,
                expectedOn);
    }

    public ShoppingStatus getStatus() {
        return status;
    }

    public LocalDate getArrivedOn() {
        return arrivedOn;
    }

    public Employee getOrderBy() {
        return orderBy;
    }

    public Task getTask() {
        return task;
    }

    public String getDescription() {
        return description;
    }

    /** Oldest first */
    public List<ShoppingEntry> getEntries() {
        return Collections.unmodifiableList(entries);
    }
}
