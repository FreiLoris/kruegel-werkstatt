package ch.kruegel.workshop.courtesycar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for courtesy cars. */
public interface CourtesyCarRepository extends JpaRepository<CourtesyCar, UUID> {

    /** All (including inactive ones), in fixed order – for administration. */
    List<CourtesyCar> findAllByOrderBySortOrderAscNameAsc();

    /** Only active ones – for bookings. */
    List<CourtesyCar> findByActiveTrueOrderBySortOrderAscNameAsc();

    boolean existsByActiveTrueAndNameIgnoreCase(String name);

    boolean existsByActiveTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByActiveTrueAndLicensePlate(String licensePlate);

    boolean existsByActiveTrueAndLicensePlateAndIdNot(String licensePlate, UUID id);

    @Query("select coalesce(max(c.sortOrder), -1) + 1 from CourtesyCar c")
    int nextSortOrder();
}
