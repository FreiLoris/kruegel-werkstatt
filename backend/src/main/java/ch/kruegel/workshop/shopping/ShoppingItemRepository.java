package ch.kruegel.workshop.shopping;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the shopping list (FB-20). */
public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, UUID> {

    /** Not arrived yet: to be ordered first, then the ordered ones – each oldest first. */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT s FROM ShoppingItem s
            WHERE s.status <> ch.kruegel.workshop.shopping.ShoppingStatus.ARRIVED
            ORDER BY CASE WHEN s.status = ch.kruegel.workshop.shopping.ShoppingStatus.TO_ORDER THEN 0 ELSE 1 END, s.createdAt""")
    List<ShoppingItem> open();

    /** Arrived: the latest first – limited, the list grows forever. */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT s FROM ShoppingItem s
            WHERE s.status = ch.kruegel.workshop.shopping.ShoppingStatus.ARRIVED
            ORDER BY s.arrivedOn DESC, s.updatedAt DESC""")
    List<ShoppingItem> arrived(Limit limit);

    /** All positions of a task, whatever their state – the block on the task (FB-19); oldest first */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("SELECT s FROM ShoppingItem s WHERE s.task.id = :taskId ORDER BY s.createdAt")
    List<ShoppingItem> ofTask(UUID taskId);
}
