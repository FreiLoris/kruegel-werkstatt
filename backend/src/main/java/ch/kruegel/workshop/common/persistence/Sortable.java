package ch.kruegel.workshop.common.persistence;

import java.util.UUID;

/** Entity with a fixed, manually set order (employees, lifts, service items, …). */
public interface Sortable {

    UUID getId();

    void moveTo(int sortOrder);
}
