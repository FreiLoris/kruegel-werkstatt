package ch.kruegel.werkstatt.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import org.hibernate.Hibernate;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Basis für alle Entitäten. Jede Tabelle hat damit dieselben vier Spalten:
 *
 * <pre>
 *   id            uuid         PRIMARY KEY
 *   version       bigint       NOT NULL
 *   erstellt_am   timestamptz  NOT NULL
 *   geaendert_am  timestamptz  NOT NULL
 * </pre>
 *
 * <ul>
 *   <li><b>id</b> – UUID Version 7: zeitlich sortierbar (gut für Datenbank-Indizes) und
 *       nicht erratbar. Wird von Hibernate beim Speichern vergeben.</li>
 *   <li><b>version</b> – Optimistic Locking: Speichern zwei Geräte gleichzeitig denselben
 *       Datensatz, gewinnt nicht einfach der Letzte. Der Zweite bekommt einen Fehler,
 *       weil seine Version veraltet ist.</li>
 *   <li><b>erstelltAm / geaendertAm</b> – werden von Spring Data automatisch gesetzt.</li>
 * </ul>
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Version
    private long version;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant erstelltAm;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant geaendertAm;

    public UUID getId() {
        return id;
    }

    public long getVersion() {
        return version;
    }

    public Instant getErstelltAm() {
        return erstelltAm;
    }

    public Instant getGeaendertAm() {
        return geaendertAm;
    }

    /**
     * Zwei Entitäten sind gleich, wenn sie dieselbe ID haben.
     * Noch nicht gespeicherte Entitäten (ohne ID) sind nur zu sich selbst gleich.
     *
     * <p>{@code Hibernate.getClass} statt {@code getClass}, weil Hibernate manchmal
     * Platzhalter-Objekte (Proxies) einer Unterklasse liefert.
     */
    @Override
    public final boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (other == null || Hibernate.getClass(this) != Hibernate.getClass(other)) {
            return false;
        }
        return id != null && id.equals(((BaseEntity) other).getId());
    }

    /**
     * Konstant pro Klasse, damit sich der Hash nicht ändert, wenn beim Speichern
     * die ID vergeben wird (sonst "verschwinden" Objekte aus einem HashSet).
     */
    @Override
    public final int hashCode() {
        return Hibernate.getClass(this).hashCode();
    }
}
