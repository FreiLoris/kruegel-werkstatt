package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * A supplier of the workshop (FB-09) – kept in this app, unlike customers and vehicles (SwissGarage).
 * Deleted for real; its articles lose it (see {@code SupplierService#delete}).
 */
@Entity
public class Supplier extends BaseEntity {

    public static final int NAME_MAX = 100;
    public static final int PHONE_MAX = 40;
    public static final int CODE_MAX = 60;
    public static final int URL_MAX = 300;
    public static final int REMARK_MAX = 1000;

    @Column(nullable = false)
    private String name;

    private String contactPerson;

    private String phone;

    private String email;

    private String webshopUrl;

    private String customerNumber;

    @Enumerated(EnumType.STRING)
    private OrderChannel orderChannel;

    private String delivery;

    private String remark;

    protected Supplier() {
        // for JPA
    }

    public Supplier(SupplierDetails details) {
        apply(details);
    }

    public void update(SupplierDetails details) {
        apply(details);
    }

    private void apply(SupplierDetails details) {
        this.name = details.name();
        this.contactPerson = details.contactPerson();
        this.phone = details.phone();
        this.email = details.email();
        this.webshopUrl = details.webshopUrl();
        this.customerNumber = details.customerNumber();
        this.orderChannel = details.orderChannel();
        this.delivery = details.delivery();
        this.remark = details.remark();
    }

    public String getName() {
        return name;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public String getWebshopUrl() {
        return webshopUrl;
    }

    public String getCustomerNumber() {
        return customerNumber;
    }

    public OrderChannel getOrderChannel() {
        return orderChannel;
    }

    public String getDelivery() {
        return delivery;
    }

    public String getRemark() {
        return remark;
    }
}
