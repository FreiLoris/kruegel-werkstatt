package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the tyre hotel. */
public interface TireSetRepository extends JpaRepository<TireSet, UUID> {

    /** The sets in the hotel with customer and vehicle in one query – the newest first. */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    @Query("SELECT s FROM TireSet s WHERE s.retrievedOn IS NULL ORDER BY s.storedOn DESC, s.createdAt DESC")
    List<TireSet> inHotel();

    /** The retrieved sets – the last retrieved first. */
    @EntityGraph(attributePaths = {"customer", "vehicle"})
    @Query("SELECT s FROM TireSet s WHERE s.retrievedOn IS NOT NULL ORDER BY s.retrievedOn DESC, s.createdAt DESC")
    List<TireSet> retrieved();
}
