package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.util.Objects;

/**
 * One line in the history of a shopping list position (FB-20): a note ("Lieferant angerufen, ab Mi
 * lieferbar") or a change of its state. Who and when: {@link #getCreatedBy()}, {@link #getCreatedAt()}.
 */
@Entity
public class ShoppingEntry extends BaseEntity {

    static final int TEXT_MAX = 1000;

    /** A note or a change of state */
    public enum Kind {
        NOTE,
        STATUS
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private ShoppingItem item;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    /** Only a note */
    private String text;

    /** Only a change of state: the new one */
    @Enumerated(EnumType.STRING)
    private ShoppingStatus status;

    protected ShoppingEntry() {
        // for JPA
    }

    private ShoppingEntry(ShoppingItem item, Kind kind, String text, ShoppingStatus status) {
        this.item = Objects.requireNonNull(item, "item");
        this.kind = kind;
        this.text = text;
        this.status = status;
    }

    static ShoppingEntry note(ShoppingItem item, String text) {
        return new ShoppingEntry(item, Kind.NOTE, Objects.requireNonNull(text, "text"), null);
    }

    static ShoppingEntry status(ShoppingItem item, ShoppingStatus status) {
        return new ShoppingEntry(item, Kind.STATUS, null, Objects.requireNonNull(status, "status"));
    }

    public Kind getKind() {
        return kind;
    }

    public String getText() {
        return text;
    }

    public ShoppingStatus getStatus() {
        return status;
    }
}
