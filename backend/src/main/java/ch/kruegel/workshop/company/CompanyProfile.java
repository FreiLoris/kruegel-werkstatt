package ch.kruegel.workshop.company;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Entity;

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

    public CompanyDetails getDetails() {
        return new CompanyDetails(name, street, postalCode, city, phone, email, website);
    }
}
