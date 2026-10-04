package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.RecordSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Database access for vehicles. Search follows in 5e. */
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    /** For the import: the vehicle with this SwissGarage internal number, if known. */
    Optional<Vehicle> findBySwissgarageNumber(String swissgarageNumber);

    /** For the import: all vehicles of one source at once (one query instead of one per row). */
    List<Vehicle> findBySource(RecordSource source);

    /** All vehicles of a holder, active ones first, then by plate. */
    List<Vehicle> findByCustomerIdOrderByActiveDescLicensePlateAsc(UUID customerId);
}
