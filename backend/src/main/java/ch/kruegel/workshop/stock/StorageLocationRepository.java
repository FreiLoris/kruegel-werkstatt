package ch.kruegel.workshop.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for storage locations. */
public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {

    /** All (including ones no longer used), in fixed order. */
    List<StorageLocation> findAllByOrderBySortOrderAscNameAsc();

    List<StorageLocation> findByActiveTrueOrderBySortOrderAscNameAsc();

    boolean existsByActiveTrueAndNameIgnoreCase(String name);

    boolean existsByActiveTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    @Query("select coalesce(max(s.sortOrder), -1) + 1 from StorageLocation s")
    int nextSortOrder();
}
