package ch.kruegel.workshop.shopping;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Database access for the shopping list (FB-20). */
public interface ShoppingItemRepository extends JpaRepository<ShoppingItem, UUID> {

    /** Neither arrived nor cancelled: the ones not ordered yet first, then the ordered ones – each oldest first. */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT s FROM ShoppingItem s
            WHERE s.status NOT IN (ch.kruegel.workshop.shopping.ShoppingStatus.ARRIVED, ch.kruegel.workshop.shopping.ShoppingStatus.CANCELLED)
            ORDER BY CASE WHEN s.status = ch.kruegel.workshop.shopping.ShoppingStatus.ORDERED THEN 1 ELSE 0 END, s.createdAt""")
    List<ShoppingItem> open();

    /**
     * Done – arrived or cancelled: the latest first (a cancelled one by its last change, it has no day
     * of arrival) – limited, the list grows forever.
     */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT s FROM ShoppingItem s
            WHERE s.status IN (ch.kruegel.workshop.shopping.ShoppingStatus.ARRIVED, ch.kruegel.workshop.shopping.ShoppingStatus.CANCELLED)
            ORDER BY COALESCE(s.arrivedOn, CAST(s.updatedAt AS LocalDate)) DESC, s.updatedAt DESC""")
    List<ShoppingItem> arrived(Limit limit);

    /** All positions of a task, whatever their state – the block on the task (FB-19); oldest first */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("SELECT s FROM ShoppingItem s WHERE s.task.id = :taskId ORDER BY s.createdAt")
    List<ShoppingItem> ofTask(UUID taskId);

    /** All positions of these tasks, whatever their state – what each order waits for ("Ohne Termin") */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("SELECT s FROM ShoppingItem s WHERE s.task.id IN :taskIds ORDER BY s.createdAt")
    List<ShoppingItem> ofTasks(Collection<UUID> taskIds);
}
