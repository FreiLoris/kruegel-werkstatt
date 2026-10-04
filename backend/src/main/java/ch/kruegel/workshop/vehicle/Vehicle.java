package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.Customer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.time.LocalDate;
import java.util.Objects;

/**
 * A customer vehicle – from SwissGarage or created locally (ADR 0003).
 *
 * <p>Like {@link Customer}: {@link #update} only for local vehicles, {@link #updateFromSwissGarage}
 * only for SwissGarage vehicles. Never deleted – tasks refer to vehicles.
 */
@Entity
public class Vehicle extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordSource source;

    private String swissgarageNumber;

    /** Holder – may be empty. LAZY: loaded only when needed (most screens only need the ID). */
    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;

    private String licensePlate;
    private String make;
    private String model;
    private String vin;
    private LocalDate firstRegistration;
    private Integer modelYear;
    private Integer mileageKm;
    private LocalDate lastMfk;
    private String color;
    private String fuel;

    private boolean active;

    protected Vehicle() {
        // for JPA
    }

    private Vehicle(RecordSource source, String swissgarageNumber, Customer customer, VehicleDetails details) {
        this.source = source;
        this.swissgarageNumber = swissgarageNumber;
        this.customer = customer;
        this.active = true;
        apply(details);
    }

    /** Vehicle created in the app. */
    public static Vehicle local(Customer customer, VehicleDetails details) {
        return new Vehicle(RecordSource.LOCAL, null, customer, details);
    }

    /** Vehicle from the SwissGarage import, identified by the SwissGarage internal number ("Int.Nr."). */
    public static Vehicle fromSwissGarage(String internalNumber, Customer customer, VehicleDetails details) {
        String number = Objects.requireNonNull(internalNumber, "internalNumber").strip();
        if (number.isEmpty()) {
            throw new IllegalArgumentException("SwissGarage internal number must not be empty");
        }
        return new Vehicle(RecordSource.SWISSGARAGE, number, customer, details);
    }

    public boolean isFromSwissGarage() {
        return source == RecordSource.SWISSGARAGE;
    }

    /** Change in the app – only local vehicles. */
    public void update(Customer holder, VehicleDetails details) {
        requireSource(RecordSource.LOCAL);
        this.customer = holder;
        apply(details);
    }

    /** Change by the import – only SwissGarage vehicles. Reactivates a vehicle that was missing before. */
    public void updateFromSwissGarage(Customer holder, VehicleDetails details) {
        requireSource(RecordSource.SWISSGARAGE);
        this.customer = holder;
        apply(details);
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    private void requireSource(RecordSource expected) {
        if (source != expected) {
            throw new IllegalStateException("Vehicle " + getId() + " has source " + source + ", expected " + expected);
        }
    }

    private void apply(VehicleDetails details) {
        this.licensePlate = details.licensePlate();
        this.make = details.make();
        this.model = details.model();
        this.vin = details.vin();
        this.firstRegistration = details.firstRegistration();
        this.modelYear = details.modelYear();
        this.mileageKm = details.mileageKm();
        this.lastMfk = details.lastMfk();
        this.color = details.color();
        this.fuel = details.fuel();
    }

    public VehicleDetails getDetails() {
        return new VehicleDetails(licensePlate, make, model, vin, firstRegistration, modelYear, mileageKm,
                lastMfk, color, fuel);
    }

    public RecordSource getSource() {
        return source;
    }

    public String getSwissgarageNumber() {
        return swissgarageNumber;
    }

    public Customer getCustomer() {
        return customer;
    }

    public boolean isActive() {
        return active;
    }
}
