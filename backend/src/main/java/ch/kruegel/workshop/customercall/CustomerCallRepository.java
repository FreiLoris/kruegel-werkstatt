package ch.kruegel.workshop.customercall;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

interface CustomerCallRepository extends JpaRepository<CustomerCall, UUID> {

    /**
     * The latest call of each customer called since then – exactly one each: the ids are UUIDv7, so
     * two calls at the same moment are still in order.
     */
    @Query(value = """
            SELECT DISTINCT ON (customer_id) * FROM customer_call
            WHERE created_at >= :since
            ORDER BY customer_id, created_at DESC, id DESC""", nativeQuery = true)
    List<CustomerCall> latestSince(Instant since);
}
