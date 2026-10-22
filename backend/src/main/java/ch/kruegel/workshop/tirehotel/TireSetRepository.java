package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Database access for the tyre hotel. */
public interface TireSetRepository extends JpaRepository<TireSet, UUID> {

    /** The sets in the hotel with customer and vehicle in one query – the newest first. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s WHERE s.state = ch.kruegel.workshop.tirehotel.TireSetState.IN_HOTEL ORDER BY s.storedOn DESC, s.createdAt DESC")
    List<TireSet> inHotel();

    /** The retrieved sets – the last retrieved first. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("""
            SELECT s FROM TireSet s
            WHERE s.retrievedOn IS NOT NULL AND s.state <> ch.kruegel.workshop.tirehotel.TireSetState.IN_HOTEL
            ORDER BY s.retrievedOn DESC, s.createdAt DESC""")
    List<TireSet> retrieved();

    /** The set in the hotel on a place, if any – to say WHO is in the way. */
    @EntityGraph(attributePaths = {"customer"})
    @Query("SELECT s FROM TireSet s WHERE s.place.id = :placeId AND s.state = ch.kruegel.workshop.tirehotel.TireSetState.IN_HOTEL")
    Optional<TireSet> onPlace(UUID placeId);

    /** All sets of a customer, in the hotel or retrieved – the candidates of a task's tyre change (13q). */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT s FROM TireSet s WHERE s.customer.id = :customerId ORDER BY s.createdAt DESC")
    List<TireSet> ofCustomer(UUID customerId);

    /** All sets of a vehicle, in the hotel or not – newest first */
    @Query("SELECT s FROM TireSet s WHERE s.vehicle.id = :vehicleId ORDER BY s.createdAt DESC")
    List<TireSet> ofVehicle(UUID vehicleId);

    /** The set a task mounted (RETRIEVED) or stored (STORED), if it did. */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT DISTINCT s FROM TireSet s JOIN s.events e WHERE e.task.id = :taskId AND e.kind IN :kinds")
    Optional<TireSet> bookedBy(UUID taskId, Collection<TireSetEventKind> kinds);

    /** The sets with a step from that day on – who changed in a season (FB-21) */
    @EntityGraph(attributePaths = {"customer", "vehicle", "place"})
    @Query("SELECT DISTINCT s FROM TireSet s JOIN s.events e WHERE e.happenedOn >= :from")
    List<TireSet> withStepsFrom(LocalDate from);

    /** The sets in the hotel at a location – before it is made smaller or deleted. */
    @EntityGraph(attributePaths = {"place"})
    @Query("SELECT s FROM TireSet s WHERE s.place.location.id = :locationId AND s.state = ch.kruegel.workshop.tirehotel.TireSetState.IN_HOTEL")
    List<TireSet> atLocation(UUID locationId);
}
