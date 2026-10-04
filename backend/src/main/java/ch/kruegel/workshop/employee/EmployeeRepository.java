package ch.kruegel.workshop.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Database access for employees. Spring Data derives the queries from the method names.
 */
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    /** All (including former ones), in fixed order – for administration. */
    List<Employee> findAllByOrderBySortOrderAscNameAsc();

    /** Only active ones, in fixed order – for all selection lists. */
    List<Employee> findByActiveTrueOrderBySortOrderAscNameAsc();

    /** Is there already an active employee with this name (case-insensitive)? */
    boolean existsByActiveTrueAndNameIgnoreCase(String name);

    /** Same as above, but excluding the person itself (when editing). */
    boolean existsByActiveTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    /** Is this person active? (check of the header "X-Person") */
    boolean existsByIdAndActiveTrue(UUID id);

    /** Are there any active persons? (No = initial setup) */
    boolean existsByActiveTrue();

    /** For new entries: put them at the end of the list. */
    @Query("select coalesce(max(e.sortOrder), -1) + 1 from Employee e")
    int nextSortOrder();
}
