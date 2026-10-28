package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.task.Task;
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
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * A set of tyres or wheels of a vehicle (FB-07, FB-12). It is stored in the tyre hotel, may be
 * {@linkplain #measure measured} again and is {@linkplain #retrieve retrieved} – each step is kept in
 * its {@linkplain #getEvents() history} with the tread depths of that moment, so the wear can be
 * followed over the seasons. A retrieved set stays (history), it is not deleted – and comes back
 * {@linkplain #storeAgain stored again} the next season: the same tyres, one history.
 * Tyres not in the hotel are sets too (FB-12): {@linkplain #recorded recorded} when the customer
 * brings them or takes them home, then {@linkplain #mount mounted} and {@linkplain #takeHome taken home}
 * – so the next call shows whether they are still good. Where it is: {@link #getState()}.
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
    private Integer torque;
    private BigDecimal pressureFront;
    private BigDecimal pressureRear;

    /** As last measured */
    @Embedded
    private TreadDepths depths;

    /** When it went into the hotel last – empty for a set that never was there (FB-12) */
    private LocalDate storedOn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TireSetState state;

    /** Empty = in the hotel */
    private LocalDate retrievedOn;

    /** Where it lies – empty while not assigned (e.g. taken over from SwissGarage) and once retrieved */
    @ManyToOne(fetch = FetchType.LAZY)
    private TirePlace place;

    // orphanRemoval: undoing a retrieval takes its event back
    @OneToMany(mappedBy = "tireSet", cascade = CascadeType.ALL, orphanRemoval = true)
    // lists show the day each set was measured (FB-12) – their histories in batches, not one query per set
    @BatchSize(size = 100)
    // id last: two events of one save (measured and retrieved) can have the same time – UUIDv7 keeps their order
    @OrderBy("happenedOn, createdAt, id")
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
        this(details, depths, day, place, note, null);
    }

    /** @param task the task whose tyre change stored it (13q); may be empty */
    public TireSet(TireSetDetails details, TreadDepths depths, LocalDate day, TirePlace place, String note, Task task) {
        apply(details);
        this.depths = Objects.requireNonNull(depths, "depths");
        this.storedOn = Objects.requireNonNull(day, "day");
        this.state = TireSetState.IN_HOTEL;
        this.place = checkedPlace(place);
        events.add(new TireSetEvent(this, TireSetEventKind.STORED, day, depths, place, note, task));
    }

    /**
     * Tyres not stored (FB-12): brought by the customer and mounted, or taken off and taken home –
     * recorded with the depths measured, so they are known next time.
     *
     * @param state {@link TireSetState#MOUNTED}, {@link TireSetState#WITH_CUSTOMER} or {@link TireSetState#DISPOSED}
     */
    public static TireSet recorded(TireSetDetails details, TreadDepths depths, LocalDate day, TireSetState state, String note, Task task) {
        if (state == TireSetState.IN_HOTEL) {
            throw new IllegalArgumentException("Into the hotel it is stored, not recorded");
        }
        TireSet set = new TireSet();
        set.apply(details);
        set.depths = Objects.requireNonNull(depths, "depths");
        set.state = state;
        set.events.add(new TireSetEvent(set, TireSetEventKind.RECORDED, day, depths, null, note, task));
        TireSetEventKind kind = switch (state) {
            case MOUNTED -> TireSetEventKind.MOUNTED;
            case DISPOSED -> TireSetEventKind.DISPOSED;
            default -> TireSetEventKind.TAKEN_HOME;
        };
        set.events.add(new TireSetEvent(set, kind, day, depths, null, note, task));
        return set;
    }

    /** Brought along again and put on the car (FB-12) – with the depths as measured now, if any. */
    public void mount(LocalDate day, String note, Task task) {
        if (state != TireSetState.WITH_CUSTOMER) {
            throw new IllegalStateException("Only a set with the customer is brought and mounted: " + state);
        }
        checkNotBefore(day, "Mounted");
        this.state = TireSetState.MOUNTED;
        events.add(new TireSetEvent(this, TireSetEventKind.MOUNTED, day, getDepths(), null, note, task));
    }

    /** Taken off, the customer takes it home (FB-12). */
    public void takeHome(LocalDate day, String note, Task task) {
        if (state != TireSetState.MOUNTED) {
            throw new IllegalStateException("Only a set on the car is taken home: " + state);
        }
        checkNotBefore(day, "Taken home");
        this.state = TireSetState.WITH_CUSTOMER;
        events.add(new TireSetEvent(this, TireSetEventKind.TAKEN_HOME, day, getDepths(), null, note, task));
    }

    /** Taken off and disposed of (FB-25) – worn out, new tyres went on. */
    public void dispose(LocalDate day, String note, Task task) {
        if (state != TireSetState.MOUNTED) {
            throw new IllegalStateException("Only a set on the car is disposed of: " + state);
        }
        checkNotBefore(day, "Disposed of");
        this.state = TireSetState.DISPOSED;
        events.add(new TireSetEvent(this, TireSetEventKind.DISPOSED, day, getDepths(), null, note, task));
    }

    /**
     * A retrieved set back into the hotel – the next season's tyre change: same tyres, same history.
     * That the place is free is checked by the service.
     */
    public void storeAgain(TreadDepths newDepths, LocalDate day, TirePlace newPlace, String note, Task task) {
        if (isInHotel()) {
            throw new IllegalStateException("Already in the hotel since " + storedOn);
        }
        checkNotBefore(day, "Stored again");
        this.depths = Objects.requireNonNull(newDepths, "depths");
        this.storedOn = day;
        this.retrievedOn = null;
        this.state = TireSetState.IN_HOTEL;
        this.place = checkedPlace(newPlace);
        events.add(new TireSetEvent(this, TireSetEventKind.STORED, day, newDepths, newPlace, note, task));
    }

    /** Onto another place (or its first one) – kept in the history. That it is free is checked by the service. */
    public void moveTo(TirePlace newPlace, LocalDate day, String note) {
        if (!isInHotel()) {
            throw new IllegalStateException("A retrieved set has no place");
        }
        Objects.requireNonNull(newPlace, "place");
        checkNotBefore(day, "Moved");
        this.place = checkedPlace(newPlace);
        events.add(new TireSetEvent(this, TireSetEventKind.MOVED, day, getDepths(), newPlace, note, null));
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
        measure(newDepths, day, note, null);
    }

    /** @param task the task whose sheet the depths were noted on (13q); may be empty */
    public void measure(TreadDepths newDepths, LocalDate day, String note, Task task) {
        checkNotBefore(day, "Measured");
        Objects.requireNonNull(newDepths, "depths");
        // wheels not measured now keep their last depth; the history keeps what was really measured
        this.depths = newDepths.over(getDepths());
        events.add(new TireSetEvent(this, TireSetEventKind.MEASURED, day, newDepths, place, note, task));
    }

    /** The day of the latest step in the history – an earlier one would contradict the current state. */
    public LocalDate lastEventDay() {
        return events.stream().map(TireSetEvent::getHappenedOn).max(LocalDate::compareTo).orElse(storedOn);
    }

    /** The steps that measure – a move or retrieval only repeats the depths of that moment */
    private static final Set<TireSetEventKind> MEASURING = Set.of(TireSetEventKind.STORED, TireSetEventKind.MEASURED, TireSetEventKind.RECORDED);

    /**
     * When its depths were measured last (FB-12: "letzte Profiltiefe mit Messdatum"). Empty = never
     * measured. After measuring only some wheels the others keep an older depth – the set's page says
     * which ones; the overview shows this day.
     */
    public LocalDate measuredOn() {
        return events.stream()
                .filter(e -> MEASURING.contains(e.getKind()) && e.getDepths().lowest() != null)
                .map(TireSetEvent::getHappenedOn)
                .max(LocalDate::compareTo).orElse(null);
    }

    /** A step before the latest one would contradict the current state */
    private void checkNotBefore(LocalDate day, String step) {
        LocalDate last = lastEventDay();
        if (last != null && day.isBefore(last)) {
            throw new IllegalArgumentException(step + " before " + last + ": " + day);
        }
    }

    /** What a task did with this set (13q, FB-12) – the kind of its step of that task among {@code kinds}; empty = none */
    public TireSetEventKind bookedAs(UUID taskId, Set<TireSetEventKind> kinds) {
        return events.stream()
                .filter(e -> e.getTask() != null && e.getTask().getId().equals(taskId) && kinds.contains(e.getKind()))
                .map(TireSetEvent::getKind)
                .findFirst().orElse(null);
    }

    /** Out of the hotel (back on the car or to the customer) – with the depths as last measured. */
    public void retrieve(LocalDate day, String note) {
        retrieve(day, note, null);
    }

    /** @param task the task whose tyre change mounted it (13q); may be empty */
    public void retrieve(LocalDate day, String note, Task task) {
        if (!isInHotel()) {
            throw new IllegalStateException("Not in the hotel: " + state);
        }
        if (day.isBefore(storedOn)) {
            throw new IllegalArgumentException("Retrieved before it was stored: " + day);
        }
        this.retrievedOn = day;
        // out of the hotel = on the car (the tyre change; "nimmt der Kunde mit" is a step of its own)
        this.state = TireSetState.MOUNTED;
        // the place it came from, then it is free for the next set
        events.add(new TireSetEvent(this, TireSetEventKind.RETRIEVED, day, getDepths(), place, note, task));
        this.place = null;
    }

    /**
     * Takes back a retrieval pressed by mistake – only while it is the set's latest step and was not
     * booked from a task (that one is corrected on the task). The history then looks as before.
     * That the place is free is checked by the service.
     *
     * @return false when there is nothing to take back
     */
    public boolean undoRetrieve(TirePlace formerPlace) {
        if (isInHotel() || events.isEmpty()) {
            return false;
        }
        // the newest by time of saving (not by day – a retrieval may be dated back); on a tie the later in the list
        TireSetEvent last = events.stream().reduce((a, b) -> b.getCreatedAt().isBefore(a.getCreatedAt()) ? a : b).orElseThrow();
        if (last.getKind() != TireSetEventKind.RETRIEVED || last.getTask() != null) {
            return false;
        }
        events.remove(last);
        this.retrievedOn = null;
        this.state = TireSetState.IN_HOTEL;
        this.place = checkedPlace(formerPlace);
        return true;
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
        this.torque = details.torque();
        this.pressureFront = details.pressureFront();
        this.pressureRear = details.pressureRear();
    }

    public TireSetDetails getDetails() {
        return new TireSetDetails(customer, vehicle, season, kind, rims, hubCaps, wheelBolts, brand, model, dimension, year, remark,
                torque, pressureFront, pressureRear);
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
        return state == TireSetState.IN_HOTEL;
    }

    public TireSetState getState() {
        return state;
    }

    /** Oldest first */
    public List<TireSetEvent> getEvents() {
        return Collections.unmodifiableList(events);
    }
}
