package ch.kruegel.workshop.common.persistence;

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
 * Base class of all entities. Every table therefore has the same six columns:
 *
 * <pre>
 *   id          uuid         PRIMARY KEY
 *   version     bigint       NOT NULL
 *   created_at  timestamptz  NOT NULL
 *   updated_at  timestamptz  NOT NULL
 *   created_by  uuid         REFERENCES employee (id)
 *   updated_by  uuid         REFERENCES employee (id)
 * </pre>
 *
 * <ul>
 *   <li><b>id</b> – UUID version 7: sortable by time (good for database indexes) and
 *       not guessable. Assigned by Hibernate on save.</li>
 *   <li><b>version</b> – optimistic locking: if two devices save the same record at the
 *       same time, the last one does not simply win. The second one gets an error because
 *       its version is stale.</li>
 *   <li><b>createdAt / updatedAt</b> – filled automatically by Spring Data.</li>
 *   <li><b>createdBy / updatedBy</b> – likewise: the person selected on the device
 *       ({@link ch.kruegel.workshop.common.person.CurrentPerson}). Empty for sample data and
 *       initial setup. Only the ID, no linked object – the frontend takes the name from
 *       the employee list.</li>
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
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private UUID createdBy;

    @LastModifiedBy
    private UUID updatedBy;

    public UUID getId() {
        return id;
    }

    public long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    /**
     * Checks whether the client had the current state when editing.
     *
     * <p>Flow for a change via the API: the client loads the record (with {@code version}),
     * changes it and sends the version back. If someone else saved in the meantime, the
     * version in the database is higher → error, instead of silently overwriting the other
     * person's change.
     *
     * @throws StaleVersionException if the versions do not match
     */
    public void checkVersion(long clientVersion) {
        if (clientVersion != version) {
            throw new StaleVersionException(clientVersion, version);
        }
    }

    /**
     * Two entities are equal if they have the same ID.
     * Unsaved entities (without ID) are only equal to themselves.
     *
     * <p>{@code Hibernate.getClass} instead of {@code getClass} because Hibernate sometimes
     * returns placeholder objects (proxies) of a subclass.
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
     * Constant per class, so the hash does not change when the ID is assigned on save
     * (otherwise objects would "disappear" from a HashSet).
     */
    @Override
    public final int hashCode() {
        return Hibernate.getClass(this).hashCode();
    }
}
