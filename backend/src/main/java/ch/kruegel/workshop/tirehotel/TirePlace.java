package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.util.Objects;

/**
 * One place of a {@link TireLocation} – it takes one set. Generated from the location's sizes; a
 * place beyond them (the location was made smaller) is no longer used.
 *
 * @see TireLocation#address(int, int, int)
 */
@Entity
public class TirePlace extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private TireLocation location;

    /** column / shelf, from 1 */
    private int a;
    /** row / level, from 1 */
    private int b;
    /** set on the trolley / compartment, from 1 */
    private int c;

    @Column(nullable = false)
    private String address;

    private boolean active;

    protected TirePlace() {
        // for JPA
    }

    TirePlace(TireLocation location, int a, int b, int c) {
        this.location = Objects.requireNonNull(location, "location");
        this.a = a;
        this.b = b;
        this.c = c;
        refresh();
    }

    /** After the location changed: address from its code, in use while within its sizes. */
    void refresh() {
        this.address = location.address(a, b, c);
        this.active = location.contains(a, b, c);
    }

    public TireLocation getLocation() {
        return location;
    }

    public int getA() {
        return a;
    }

    public int getB() {
        return b;
    }

    public int getC() {
        return c;
    }

    public String getAddress() {
        return address;
    }

    public boolean isActive() {
        return active;
    }
}
