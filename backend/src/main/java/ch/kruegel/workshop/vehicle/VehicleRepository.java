package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.RecordSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Database access for vehicles. Search: see {@code customersearch}. */
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    /** For the import: the vehicle with this SwissGarage internal number, if known. */
    Optional<Vehicle> findBySwissgarageNumber(String swissgarageNumber);

    /** For the import: all vehicles of one source at once (one query instead of one per row). */
    List<Vehicle> findBySource(RecordSource source);

    /** For the import page: how many active vehicles come from this source. */
    long countBySourceAndActiveTrue(RecordSource source);

    /** For the import page: active vehicles of this source whose holder is unknown. */
    long countBySourceAndActiveTrueAndCustomerIsNull(RecordSource source);

    /**
     * For the address list import: SwissGarage address numbers of the holders of active vehicles –
     * they stay customers, whatever their address kind (FB-27).
     */
    @Query("""
            SELECT DISTINCT v.customer.swissgarageNumber FROM Vehicle v
            WHERE v.active AND v.customer.source = ch.kruegel.workshop.common.RecordSource.SWISSGARAGE""")
    Set<String> findAddressNumbersOfActiveHolders();

    /** All vehicles of a holder, active ones first, then by plate. */
    List<Vehicle> findByCustomerIdOrderByActiveDescLicensePlateAsc(UUID customerId);

    /** Active vehicles of several holders at once, by plate – for the search result. */
    List<Vehicle> findByCustomerIdInAndActiveTrueOrderByLicensePlateAsc(Collection<UUID> customerIds);
}
