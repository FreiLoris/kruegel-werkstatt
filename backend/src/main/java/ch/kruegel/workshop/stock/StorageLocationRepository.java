package ch.kruegel.workshop.stock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Database access for storage locations. A workshop has a few dozen at most – the service checks
 * names and the tree on the whole list in memory.
 */
public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {

    /** All (including ones no longer used), in fixed order per level. */
    List<StorageLocation> findAllByOrderBySortOrderAscNameAsc();

    List<StorageLocation> findByActiveTrueOrderBySortOrderAscNameAsc();
}
