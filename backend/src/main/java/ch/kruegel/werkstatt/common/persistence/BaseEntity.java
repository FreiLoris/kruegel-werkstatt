package ch.kruegel.werkstatt.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import org.hibernate.Hibernate;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Basis für alle Entitäten. Jede Tabelle hat damit dieselben sechs Spalten:
 *
 * <pre>
 *   id             uuid         PRIMARY KEY
 *   version        bigint       NOT NULL
 *   erstellt_am    timestamptz  NOT NULL
 *   geaendert_am   timestamptz  NOT NULL
 *   erstellt_von   uuid         REFERENCES mitarbeiter (id)
 *   geaendert_von  uuid         REFERENCES mitarbeiter (id)
 * </pre>
 *
 * <ul>
 *   <li><b>id</b> – UUID Version 7: zeitlich sortierbar (gut für Datenbank-Indizes) und
 *       nicht erratbar. Wird von Hibernate beim Speichern vergeben.</li>
 *   <li><b>version</b> – Optimistic Locking: Speichern zwei Geräte gleichzeitig denselben
 *       Datensatz, gewinnt nicht einfach der Letzte. Der Zweite bekommt einen Fehler,
 *       weil seine Version veraltet ist.</li>
 *   <li><b>erstelltAm / geaendertAm</b> – werden von Spring Data automatisch gesetzt.</li>
 *   <li><b>erstelltVon / geaendertVon</b> – ebenso: die Person, die das Gerät gewählt hat
 *       ({@link ch.kruegel.werkstatt.common.person.AktuellePerson}). Leer bei Testdaten und
 *       bei der Ersteinrichtung. Nur die ID, kein verknüpftes Objekt – den Namen holt sich
 *       das Frontend aus der Mitarbeiterliste.</li>
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

    @CreatedBy
    @Column(updatable = false)
    private UUID erstelltVon;

    @LastModifiedBy
    private UUID geaendertVon;

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

    public UUID getErstelltVon() {
        return erstelltVon;
    }

    public UUID getGeaendertVon() {
        return geaendertVon;
    }

    /**
     * Prüft, ob der Client beim Bearbeiten den aktuellen Stand hatte.
     *
     * <p>Ablauf bei einer Änderung über die API: Der Client lädt den Datensatz (mit
     * {@code version}), ändert ihn und schickt die Version mit. Hat in der Zwischenzeit
     * jemand anderes gespeichert, ist die Version in der Datenbank höher → Fehler, statt
     * die fremde Änderung still zu überschreiben.
     *
     * @throws VeralteteVersionException wenn die Versionen nicht übereinstimmen
     */
    public void pruefeVersion(long versionDesClients) {
        if (versionDesClients != version) {
            throw new VeralteteVersionException(versionDesClients, version);
        }
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
