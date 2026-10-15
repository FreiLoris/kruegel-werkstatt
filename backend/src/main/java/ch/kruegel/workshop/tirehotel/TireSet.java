package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.vehicle.Vehicle;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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

/**
 * A set of tyres or wheels in the tyre hotel (FB-07). It is stored, may be {@linkplain #measure
 * measured} again and is {@linkplain #retrieve retrieved} – each step is kept in its
 * {@linkplain #getEvents() history} with the tread depths of that moment, so the wear can be
 * followed over the seasons. A retrieved set stays (history), it is not deleted.
 */
@Entity
public class TireSet extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Season season;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TireSetKind kind;

    @Enumerated(EnumType.STRING)
    private RimKind rims;

    private boolean hubCaps;
    private boolean wheelBolts;
    private String brand;
    private String model;
    private String dimension;
    private Integer year;
    private String remark;

    /** As last measured */
    @Embedded
    private TreadDepths depths;

    @Column(nullable = false)
    private LocalDate storedOn;

    /** Empty = in the hotel */
    private LocalDate retrievedOn;

    /** Where it lies – empty while not assigned (e.g. taken over from SwissGarage) and once retrieved */
    @ManyToOne(fetch = FetchType.LAZY)
    private TirePlace place;

    @OneToMany(mappedBy = "tireSet", cascade = CascadeType.ALL)
    @OrderBy("happenedOn, createdAt")
    private List<TireSetEvent> events = new ArrayList<>();

    protected TireSet() {
        // for JPA
    }

    /**
     * Stored on {@code day} with the depths measured then – the first entry of its history.
     *
     * @param place may be open (assigned later); that it is free is checked by the service
     */
    public TireSet(TireSetDetails details, TreadDepths depths, LocalDate day, TirePlace place, String note) {
        apply(details);
        this.depths = Objects.requireNonNull(depths, "depths");
        this.storedOn = Objects.requireNonNull(day, "day");
        this.place = checkedPlace(place);
        events.add(new TireSetEvent(this, TireSetEventKind.STORED, day, depths, place, note));
    }

    /** Onto another place (or its first one) – kept in the history. That it is free is checked by the service. */
    public void moveTo(TirePlace newPlace, LocalDate day, String note) {
        if (!isInHotel()) {
            throw new IllegalStateException("A retrieved set has no place");
        }
        Objects.requireNonNull(newPlace, "place");
        if (day.isBefore(storedOn)) {
            throw new IllegalArgumentException("Moved before it was stored: " + day);
        }
        this.place = checkedPlace(newPlace);
        events.add(new TireSetEvent(this, TireSetEventKind.MOVED, day, getDepths(), newPlace, note));
    }

    private static TirePlace checkedPlace(TirePlace place) {
        if (place != null && !place.isActive()) {
            throw new IllegalArgumentException("Place no longer used: " + place.getAddress());
        }
        return place;
    }

    /** New data – the depths and days stay; they change by measuring and retrieving. */
    public void update(TireSetDetails details) {
        apply(details);
    }

    /** Measured again (e.g. on the hand-written task sheet): the new depths, kept in the history. */
    public void measure(TreadDepths newDepths, LocalDate day, String note) {
        if (day.isBefore(storedOn)) {
            throw new IllegalArgumentException("Measured before it was stored: " + day);
        }
        this.depths = Objects.requireNonNull(newDepths, "depths");
        events.add(new TireSetEvent(this, TireSetEventKind.MEASURED, day, newDepths, place, note));
    }

    /** Out of the hotel (back on the car or to the customer) – with the depths as last measured. */
    public void retrieve(LocalDate day, String note) {
        if (!isInHotel()) {
            throw new IllegalStateException("Already retrieved on " + retrievedOn);
        }
        if (day.isBefore(storedOn)) {
            throw new IllegalArgumentException("Retrieved before it was stored: " + day);
        }
        this.retrievedOn = day;
        // the place it came from, then it is free for the next set
        events.add(new TireSetEvent(this, TireSetEventKind.RETRIEVED, day, getDepths(), place, note));
        this.place = null;
    }

    private void apply(TireSetDetails details) {
        this.customer = details.customer();
        this.vehicle = details.vehicle();
        this.season = details.season();
        this.kind = details.kind();
        this.rims = details.rims();
        this.hubCaps = details.hubCaps();
        this.wheelBolts = details.wheelBolts();
        this.brand = details.brand();
        this.model = details.model();
        this.dimension = details.dimension();
        this.year = details.year();
        this.remark = details.remark();
    }

    public TireSetDetails getDetails() {
        return new TireSetDetails(customer, vehicle, season, kind, rims, hubCaps, wheelBolts, brand, model, dimension, year, remark);
    }

    public Customer getCustomer() {
        return customer;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public TreadDepths getDepths() {
        return TreadDepths.orNone(depths);
    }

    public LocalDate getStoredOn() {
        return storedOn;
    }

    public LocalDate getRetrievedOn() {
        return retrievedOn;
    }

    public TirePlace getPlace() {
        return place;
    }

    public boolean isInHotel() {
        return retrievedOn == null;
    }

    /** Oldest first */
    public List<TireSetEvent> getEvents() {
        return Collections.unmodifiableList(events);
    }
}
