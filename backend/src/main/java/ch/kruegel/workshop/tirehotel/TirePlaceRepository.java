package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the places of the tyre hotel. */
public interface TirePlaceRepository extends JpaRepository<TirePlace, UUID> {

    /** All places, by location and position – the place view draws them. */
    @Query("SELECT p FROM TirePlace p JOIN FETCH p.location l ORDER BY l.sortOrder, l.code, p.a, p.b, p.c")
    List<TirePlace> findAllInOrder();

    List<TirePlace> findByLocationId(UUID locationId);
}
