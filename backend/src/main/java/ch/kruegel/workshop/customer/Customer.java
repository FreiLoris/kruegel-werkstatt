package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.util.Objects;

/**
 * A customer of the workshop – from SwissGarage or created locally (ADR 0003).
 *
 * <p>Two ways to change it, depending on the source:
 * {@link #update(CustomerDetails)} only for local customers (app),
 * {@link #updateFromSwissGarage(CustomerDetails)} only for SwissGarage customers (import).
 * Never deleted – tasks refer to customers.
 */
@Entity
public class Customer extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordSource source;

    private String swissgarageNumber;

    private String salutation;
    private String firstName;
    private String lastName;
    private String company;
    private String addition;
    private String street;
    private String postalCode;
    private String city;
    private String phone;
    private String mobile;
    private String email;

    private boolean active;

    protected Customer() {
        // for JPA
    }

    private Customer(RecordSource source, String swissgarageNumber, CustomerDetails details) {
        this.source = source;
        this.swissgarageNumber = swissgarageNumber;
        this.active = true;
        apply(details);
    }

    /** Walk-in customer created in the app. */
    public static Customer local(CustomerDetails details) {
        return new Customer(RecordSource.LOCAL, null, details);
    }

    /** Customer from the SwissGarage import, identified by the SwissGarage address number. */
    public static Customer fromSwissGarage(String addressNumber, CustomerDetails details) {
        String number = Objects.requireNonNull(addressNumber, "addressNumber").strip();
        if (number.isEmpty()) {
            throw new IllegalArgumentException("SwissGarage address number must not be empty");
        }
        return new Customer(RecordSource.SWISSGARAGE, number, details);
    }

    public boolean isFromSwissGarage() {
        return source == RecordSource.SWISSGARAGE;
    }

    /** Change in the app – only local customers; SwissGarage customers are changed in SwissGarage. */
    public void update(CustomerDetails details) {
        requireSource(RecordSource.LOCAL);
        apply(details);
    }

    /** Change by the import – only SwissGarage customers. Reactivates a customer that was missing before. */
    public void updateFromSwissGarage(CustomerDetails details) {
        requireSource(RecordSource.SWISSGARAGE);
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
            throw new IllegalStateException("Customer " + getId() + " has source " + source + ", expected " + expected);
        }
    }

    private void apply(CustomerDetails details) {
        this.salutation = details.salutation();
        this.firstName = details.firstName();
        this.lastName = details.lastName();
        this.company = details.company();
        this.addition = details.addition();
        this.street = details.street();
        this.postalCode = details.postalCode();
        this.city = details.city();
        this.phone = details.phone();
        this.mobile = details.mobile();
        this.email = details.email();
    }

    public CustomerDetails getDetails() {
        return new CustomerDetails(salutation, firstName, lastName, company, addition, street, postalCode,
                city, phone, mobile, email);
    }

    public RecordSource getSource() {
        return source;
    }

    public String getSwissgarageNumber() {
        return swissgarageNumber;
    }

    public boolean isActive() {
        return active;
    }
}
