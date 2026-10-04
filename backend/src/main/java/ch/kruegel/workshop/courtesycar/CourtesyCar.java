package ch.kruegel.workshop.courtesycar;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.time.LocalDate;

/**
 * A courtesy car (Ersatzwagen): pool car a customer gets while their own car is being repaired.
 *
 * <p>Always created and changed through {@link CourtesyCarDetails}. Cars that are sold or
 * returned are {@linkplain #deactivate() deactivated}, not deleted – bookings keep their reference.
 */
@Entity
public class CourtesyCar extends BaseEntity implements Sortable {

    @Column(nullable = false)
    private String name;

    private String model;

    private String licensePlate;

    private LocalDate serviceDue;

    private LocalDate insuranceUntil;

    private boolean active;

    private int sortOrder;

    protected CourtesyCar() {
        // for JPA
    }

    public CourtesyCar(CourtesyCarDetails details, int sortOrder) {
        apply(details);
        this.active = true;
        this.sortOrder = sortOrder;
    }

    public void update(CourtesyCarDetails details) {
        apply(details);
    }

    /** Sold or returned: no longer bookable, but kept. */
    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    @Override
    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    private void apply(CourtesyCarDetails details) {
        this.name = details.name();
        this.model = details.model();
        this.licensePlate = details.licensePlate();
        this.serviceDue = details.serviceDue();
        this.insuranceUntil = details.insuranceUntil();
    }

    public CourtesyCarDetails getDetails() {
        return new CourtesyCarDetails(name, model, licensePlate, serviceDue, insuranceUntil);
    }

    public String getName() {
        return name;
    }

    public String getModel() {
        return model;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public LocalDate getServiceDue() {
        return serviceDue;
    }

    public LocalDate getInsuranceUntil() {
        return insuranceUntil;
    }

    public boolean isActive() {
        return active;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
