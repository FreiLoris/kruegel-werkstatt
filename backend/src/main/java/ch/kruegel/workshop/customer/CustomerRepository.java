package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.common.RecordSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Database access for customers. Search: see {@code customersearch}. */
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    /** For the import: the customer with this SwissGarage address number, if known. */
    Optional<Customer> findBySwissgarageNumber(String swissgarageNumber);

    /** For the import: all customers of one source at once (one query instead of one per row). */
    List<Customer> findBySource(RecordSource source);

    /** For the import page: how many active customers come from this source. */
    long countBySourceAndActiveTrue(RecordSource source);
}
