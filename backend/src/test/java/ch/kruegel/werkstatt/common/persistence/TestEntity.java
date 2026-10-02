package ch.kruegel.werkstatt.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Minimale Entität nur für Tests von {@link BaseEntity}.
 */
@Entity
public class TestEntity extends BaseEntity {

    @Column(nullable = false)
    private String name;

    protected TestEntity() {
        // für JPA
    }

    TestEntity(String name) {
        this.name = name;
    }

    void setName(String name) {
        this.name = name;
    }
}
