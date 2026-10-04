package ch.kruegel.workshop.customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** Database access for customers. Search follows in 5e. */
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    /** For the import: the customer with this SwissGarage address number, if known. */
    Optional<Customer> findBySwissgarageNumber(String swissgarageNumber);
}
