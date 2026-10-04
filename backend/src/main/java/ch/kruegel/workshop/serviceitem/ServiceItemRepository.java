package ch.kruegel.workshop.serviceitem;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for service items. */
public interface ServiceItemRepository extends JpaRepository<ServiceItem, UUID> {

    /** All (including ones no longer offered), in fixed order – for administration. */
    List<ServiceItem> findAllByOrderBySortOrderAscNameAsc();

    /** Only active ones – for the checkboxes on a task. */
    List<ServiceItem> findByActiveTrueOrderBySortOrderAscNameAsc();

    boolean existsByActiveTrueAndNameIgnoreCase(String name);

    boolean existsByActiveTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    @Query("select coalesce(max(s.sortOrder), -1) + 1 from ServiceItem s")
    int nextSortOrder();
}
