package ch.kruegel.workshop.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Minimal entity only for testing {@link BaseEntity}.
 */
@Entity
public class TestEntity extends BaseEntity {

    @Column(nullable = false)
    private String name;

    protected TestEntity() {
        // for JPA
    }

    TestEntity(String name) {
        this.name = name;
    }

    void setName(String name) {
        this.name = name;
    }
}
