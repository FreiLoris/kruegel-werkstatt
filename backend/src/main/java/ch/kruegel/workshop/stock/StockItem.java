package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

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
}
