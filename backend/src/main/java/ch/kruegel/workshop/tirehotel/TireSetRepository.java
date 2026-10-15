package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Database access for the tyre hotel. */
public interface TireSetRepository extends JpaRepository<TireSet, UUID> {

    /** The sets in the hotel with customer and vehicle in one query – the newest first. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s WHERE s.retrievedOn IS NULL ORDER BY s.storedOn DESC, s.createdAt DESC")
    List<TireSet> inHotel();

    /** The retrieved sets – the last retrieved first. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s WHERE s.retrievedOn IS NOT NULL ORDER BY s.retrievedOn DESC, s.createdAt DESC")
    List<TireSet> retrieved();

    /** The set in the hotel on a place, if any – to say WHO is in the way. */
    @EntityGraph(attributePaths = {"customer"})
    @Query("SELECT s FROM TireSet s WHERE s.place.id = :placeId AND s.retrievedOn IS NULL")
    Optional<TireSet> onPlace(UUID placeId);

    /** All sets of a customer, in the hotel or retrieved – the candidates of a task's tyre change (13q). */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s WHERE s.customer.id = :customerId ORDER BY s.storedOn DESC, s.createdAt DESC")
    List<TireSet> ofCustomer(UUID customerId);

    /** The set a task mounted (RETRIEVED) or stored (STORED), if it did. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s JOIN s.events e WHERE e.task.id = :taskId AND e.kind = :kind")
    Optional<TireSet> bookedBy(UUID taskId, TireSetEventKind kind);

    /** The sets in the hotel at a location – before it is made smaller or deleted. */
    @EntityGraph(attributePaths = {"place"})
    @Query("SELECT s FROM TireSet s WHERE s.place.location.id = :locationId AND s.retrievedOn IS NULL")
    List<TireSet> atLocation(UUID locationId);
}
