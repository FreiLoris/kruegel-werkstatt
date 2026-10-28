package ch.kruegel.workshop.customercall;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.Customer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.util.Objects;

/**
 * A call to the customer (FB-16, FB-21): when and who (created at / by) and how it went. Not edited –
 * a call tapped by mistake is deleted.
 */
@Entity
public class CustomerCall extends BaseEntity {

    static final int NOTE_MAX = 200;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallOutcome outcome;

    private String note;

    protected CustomerCall() {
        // for JPA
    }

    public CustomerCall(Customer customer, CallOutcome outcome, String note) {
        this.customer = Objects.requireNonNull(customer, "customer");
        this.outcome = Objects.requireNonNull(outcome, "outcome");
        this.note = Texts.checkMaxLength(Texts.emptyToNull(note), NOTE_MAX, "Note");
    }

    public Customer getCustomer() {
        return customer;
    }

    public CallOutcome getOutcome() {
        return outcome;
    }

    public String getNote() {
        return note;
    }
}
