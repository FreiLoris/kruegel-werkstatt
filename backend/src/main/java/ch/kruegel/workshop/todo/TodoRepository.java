package ch.kruegel.workshop.todo;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Database access for to-dos. Filters: empty = all. LEFT JOINs, so to-dos without person or task
 * are found too.
 */
public interface TodoRepository extends JpaRepository<Todo, UUID> {

    /** Open to-dos: the next deadline first, without deadline at the end, then oldest first. */
    @EntityGraph(attributePaths = {"task", "task.customer"})
    @Query("""
            SELECT t FROM Todo t LEFT JOIN t.assignee a LEFT JOIN t.task k
            WHERE t.doneAt IS NULL
              AND (:assigneeId IS NULL OR a.id = :assigneeId)
              AND (:shopping IS NULL OR t.shopping = :shopping)
              AND (:taskId IS NULL OR k.id = :taskId)
            ORDER BY CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate, t.createdAt""")
    List<Todo> open(UUID assigneeId, Boolean shopping, UUID taskId);

    /** Done to-dos: the latest first – limited, the list grows forever. */
    @EntityGraph(attributePaths = {"task", "task.customer"})
    @Query("""
            SELECT t FROM Todo t LEFT JOIN t.assignee a LEFT JOIN t.task k
            WHERE t.doneAt IS NOT NULL
              AND (:assigneeId IS NULL OR a.id = :assigneeId)
              AND (:shopping IS NULL OR t.shopping = :shopping)
              AND (:taskId IS NULL OR k.id = :taskId)
            ORDER BY t.doneAt DESC""")
    List<Todo> done(UUID assigneeId, Boolean shopping, UUID taskId, Limit limit);
}
