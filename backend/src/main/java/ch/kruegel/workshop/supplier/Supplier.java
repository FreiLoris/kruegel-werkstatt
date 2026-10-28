package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

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

    private String phone;

    private String email;

    private String webshopUrl;

    private String customerNumber;

    @Enumerated(EnumType.STRING)
    private OrderChannel orderChannel;

    private String delivery;

    private String remark;

    /** Departments and people (FB-30) – phone and e-mail above are the main line */
    @ElementCollection
    @CollectionTable(name = "supplier_contact", joinColumns = @JoinColumn(name = "supplier_id"))
    @OrderColumn(name = "position")
    // the list shows all suppliers: load the contacts of 50 in one go instead of one by one
    @BatchSize(size = 50)
    private List<SupplierContact> contacts = new ArrayList<>();

    /** Ways it delivers – Tagesexpress, tours with their order deadline … (FB-30) */
    @ElementCollection
    @CollectionTable(name = "supplier_delivery", joinColumns = @JoinColumn(name = "supplier_id"))
    @OrderColumn(name = "position")
    @BatchSize(size = 50)
    private List<SupplierDelivery> deliveries = new ArrayList<>();

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
        this.phone = details.phone();
        this.email = details.email();
        this.webshopUrl = details.webshopUrl();
        this.customerNumber = details.customerNumber();
        this.orderChannel = details.orderChannel();
        this.delivery = details.delivery();
        this.remark = details.remark();
        // replaced as a whole – they are edited together with the supplier; untouched when the same
        // (otherwise every save would rewrite the rows)
        if (!contacts.equals(details.contacts())) {
            contacts.clear();
            contacts.addAll(details.contacts());
        }
        if (!deliveries.equals(details.deliveries())) {
            deliveries.clear();
            deliveries.addAll(details.deliveries());
        }
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

    public List<SupplierContact> getContacts() {
        return List.copyOf(contacts);
    }

    public List<SupplierDelivery> getDeliveries() {
        return List.copyOf(deliveries);
    }

    public String getRemark() {
        return remark;
    }
}
