package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * An article in the workshop's stock list (FB-08): kept by hand – no stock bookings and no minimum
 * quantities (the workshop's wish). Deleted for real when it is gone.
 */
@Entity
public class StockItem extends BaseEntity {

    public static final int NAME_MAX = 100;
    public static final int CODE_MAX = 60;
    public static final int REMARK_MAX = 1000;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockCategory category;

    private String articleNumber;

    private String manufacturer;

    private Integer quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    private StorageLocation storageLocation;

    private String remark;

    /** The first one is the main supplier (FB-09) */
    @ElementCollection
    @CollectionTable(name = "stock_item_supplier", joinColumns = @JoinColumn(name = "stock_item_id"))
    @OrderColumn(name = "position")
    // the list shows all articles: load the suppliers of 50 articles in one go instead of one by one
    @BatchSize(size = 50)
    private List<StockItemSupplier> suppliers = new ArrayList<>();

    protected StockItem() {
        // for JPA
    }

    public StockItem(StockItemDetails details) {
        apply(details);
    }

    public void update(StockItemDetails details) {
        apply(details);
    }

    private void apply(StockItemDetails details) {
        this.name = details.name();
        this.category = details.category();
        this.articleNumber = details.articleNumber();
        this.manufacturer = details.manufacturer();
        this.quantity = details.quantity();
        this.storageLocation = details.storageLocation();
        this.remark = details.remark();
        // a new list: Hibernate writes the rows anew (positions and order may have changed)
        this.suppliers = new ArrayList<>(details.suppliers());
    }

    /** The supplier is deleted – the next one, if any, becomes the main supplier. */
    public void dropSupplier(UUID supplierId) {
        List<StockItemSupplier> rest = suppliers.stream().filter(s -> !s.supplier().getId().equals(supplierId)).toList();
        this.suppliers = new ArrayList<>(rest);
    }

    public String getName() {
        return name;
    }

    public StockCategory getCategory() {
        return category;
    }

    public String getArticleNumber() {
        return articleNumber;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public StorageLocation getStorageLocation() {
        return storageLocation;
    }

    public String getRemark() {
        return remark;
    }

    public List<StockItemSupplier> getSuppliers() {
        return List.copyOf(suppliers);
    }
}
