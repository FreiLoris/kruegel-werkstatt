package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the locations of the tyre hotel. */
public interface TireLocationRepository extends JpaRepository<TireLocation, UUID> {

    @Query("SELECT l FROM TireLocation l ORDER BY l.sortOrder, l.code")
    List<TireLocation> findAllInOrder();

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, UUID id);

    @Query("SELECT coalesce(max(l.sortOrder), -1) FROM TireLocation l")
    int maxSortOrder();
}
