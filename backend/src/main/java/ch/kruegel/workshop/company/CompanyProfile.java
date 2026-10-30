package ch.kruegel.workshop.company;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Entity;

import java.time.Instant;
import java.util.Objects;

/**
 * The workshop's own data – exactly one row (migration V12). The logo is in the same row but not
 * mapped here: {@link CompanyLogoStore} reads and writes it with SQL, so it is not loaded every time.
 */
@Entity
public class CompanyProfile extends BaseEntity {

    private String name;
    private String street;
    private String postalCode;
    private String city;
    private String phone;
    private String email;
    private String website;
    /** The canton new Swiss licence plates start with (neutral 4) */
    private String plateCanton;
    /** When the setup assistant was finished or skipped (neutral 4); empty: a new installation */
    private Instant setupCompletedAt;

    protected CompanyProfile() {
        // for JPA – the only row is created by the migration
    }

    public void update(CompanyDetails details) {
        this.name = details.name();
        this.street = details.street();
        this.postalCode = details.postalCode();
        this.city = details.city();
        this.phone = details.phone();
        this.email = details.email();
        this.website = details.website();
    }

    public void changePlateCanton(String canton) {
        this.plateCanton = Objects.requireNonNull(canton, "canton");
    }

    public String getPlateCanton() {
        return plateCanton;
    }

    /** Once – a second time keeps the first */
    public void completeSetup(Instant at) {
        if (setupCompletedAt == null) {
            setupCompletedAt = at;
        }
    }

    public boolean isSetUp() {
        return setupCompletedAt != null;
    }

    public CompanyDetails getDetails() {
        return new CompanyDetails(name, street, postalCode, city, phone, email, website);
    }
}
