package ch.kruegel.workshop.inspectionstation;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * An inspection station (FB-10) where a car goes for its MFK. One of them is the standard – the
 * station of nearly every inspection – and preset on a new task.
 *
 * <p>The trip there and back incl. the inspection takes {@link #getMinutes()} – preset as the duration
 * of the MFK appointment. No longer used ones are {@linkplain #deactivate() deactivated}, not deleted –
 * old tasks still name them.
 */
@Entity
public class InspectionStation extends BaseEntity {

    public static final int NAME_MAX = 100;
    public static final int ADDRESS_MAX = 200;
    public static final int PHONE_MAX = 40;
    public static final int MINUTES_MIN = 15;
    public static final int MINUTES_MAX = 480;

    @Column(nullable = false)
    private String name;

    private String address;

    private String phone;

    private int minutes;

    /** The station preset on a new task – exactly one, and it is in use */
    @Column(name = "is_default")
    private boolean standard;

    private boolean active;

    protected InspectionStation() {
        // for JPA
    }

    public InspectionStation(String name, String address, String phone, int minutes) {
        update(name, address, phone, minutes);
        this.active = true;
    }

    /** Texts are trimmed, empty = not set; the name is required. */
    public void update(String name, String address, String phone, int minutes) {
        String cleaned = Texts.checkMaxLength(Texts.emptyToNull(name), NAME_MAX, "Name");
        if (cleaned == null) {
            throw new IllegalArgumentException("Name is required");
        }
        if (minutes < MINUTES_MIN || minutes > MINUTES_MAX) {
            throw new IllegalArgumentException("Minutes out of range: " + minutes);
        }
        this.name = cleaned;
        this.address = Texts.checkMaxLength(Texts.emptyToNull(address), ADDRESS_MAX, "Address");
        this.phone = Texts.checkMaxLength(Texts.emptyToNull(phone), PHONE_MAX, "Phone");
        this.minutes = minutes;
    }

    /** The standard is always in use – another one becomes the standard first. */
    public void deactivate() {
        if (standard) {
            throw new IllegalStateException("The standard station stays in use");
        }
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    /** Only one is the standard: the service takes it from the old one first. */
    void markAsStandard(boolean standard) {
        if (standard && !active) {
            throw new IllegalStateException("A station no longer in use cannot be the standard");
        }
        this.standard = standard;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getPhone() {
        return phone;
    }

    public int getMinutes() {
        return minutes;
    }

    public boolean isStandard() {
        return standard;
    }

    public boolean isActive() {
        return active;
    }
}
