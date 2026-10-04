package ch.kruegel.workshop.lift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for lifts. */
public interface LiftRepository extends JpaRepository<Lift, UUID> {

    /** All (including decommissioned ones), in fixed order – for administration. */
    List<Lift> findAllByOrderBySortOrderAscNameAsc();

    /** Only active ones, in fixed order – for columns and selection lists. */
    List<Lift> findByActiveTrueOrderBySortOrderAscNameAsc();

    boolean existsByActiveTrueAndNameIgnoreCase(String name);

    boolean existsByActiveTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    long countByActiveTrue();

    @Query("select coalesce(max(l.sortOrder), -1) + 1 from Lift l")
    int nextSortOrder();
}
