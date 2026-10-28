package ch.kruegel.workshop.customercall;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

interface CustomerCallRepository extends JpaRepository<CustomerCall, UUID> {

    /** The latest call of each of these customers – those never called are missing */
    @Query("""
            SELECT c FROM CustomerCall c
            WHERE c.customer.id IN :customerIds
              AND c.createdAt = (SELECT max(d.createdAt) FROM CustomerCall d WHERE d.customer = c.customer)""")
    List<CustomerCall> latestOf(Collection<UUID> customerIds);
}
