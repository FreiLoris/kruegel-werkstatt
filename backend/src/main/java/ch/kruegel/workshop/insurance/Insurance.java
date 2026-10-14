package ch.kruegel.workshop.insurance;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * An insurance (FB-06): for an insurance case the task sheet prints it with its phone number.
 *
 * <p>No longer used ones are {@linkplain #deactivate() deactivated}, not deleted – old tasks still name them.
 */
@Entity
public class Insurance extends BaseEntity {

    public static final int NAME_MAX = 100;
    public static final int PHONE_MAX = 40;

    @Column(nullable = false)
    private String name;

    private String phone;

    private String email;

    private boolean active;

    protected Insurance() {
        // for JPA
    }

    public Insurance(String name, String phone, String email) {
        update(name, phone, email);
        this.active = true;
    }

    /** Texts are trimmed, empty = not set; the name is required. */
    public void update(String name, String phone, String email) {
        String cleaned = Texts.checkMaxLength(Texts.emptyToNull(name), NAME_MAX, "Name");
        if (cleaned == null) {
            throw new IllegalArgumentException("Name is required");
        }
        this.name = cleaned;
        this.phone = Texts.checkMaxLength(Texts.emptyToNull(phone), PHONE_MAX, "Phone");
        this.email = Texts.checkMaxLength(Texts.emptyToNull(email), NAME_MAX, "Email");
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    public String getName() {
        return name;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public boolean isActive() {
        return active;
    }
}
