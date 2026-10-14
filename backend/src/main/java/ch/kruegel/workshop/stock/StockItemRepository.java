package ch.kruegel.workshop.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the stock list. */
public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

    /**
     * The whole list by name – a workshop has a few hundred articles at most, so the page searches,
     * filters and sorts them itself (instantly, also offline from the cache). With the storage location
     * in the same query instead of one query per article.
     */
    @Query("select s from StockItem s left join fetch s.storageLocation order by lower(s.name), s.id")
    List<StockItem> findAllWithLocation();

    /** The articles a supplier sells – to let go of it before it is deleted */
    @Query("select distinct s from StockItem s join s.suppliers link where link.supplier.id = :supplierId")
    List<StockItem> findBySupplier(UUID supplierId);
}
