package ch.kruegel.workshop.todo;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Database access for to-dos. Filters: empty = all. LEFT JOINs, so to-dos without person or task
 * are found too.
 */
public interface TodoRepository extends JpaRepository<Todo, UUID> {

    /** Open to-dos: the next deadline first, without deadline at the end, then oldest first. */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT t FROM Todo t LEFT JOIN t.assignee a LEFT JOIN t.task k
            WHERE t.doneAt IS NULL
              AND (:assigneeId IS NULL OR a.id = :assigneeId)
              AND (:unassigned = false OR a.id IS NULL)
              AND (:taskId IS NULL OR k.id = :taskId)
              AND (:noteId IS NULL OR t.noteId = :noteId)
            ORDER BY CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END, t.dueDate, t.createdAt""")
    List<Todo> open(UUID assigneeId, boolean unassigned, UUID taskId, UUID noteId);

    /** Done to-dos: the latest first – limited, the list grows forever. */
    @EntityGraph(attributePaths = {"task", "task.customer", "task.vehicle"})
    @Query("""
            SELECT t FROM Todo t LEFT JOIN t.assignee a LEFT JOIN t.task k
            WHERE t.doneAt IS NOT NULL
              AND (:assigneeId IS NULL OR a.id = :assigneeId)
              AND (:unassigned = false OR a.id IS NULL)
              AND (:taskId IS NULL OR k.id = :taskId)
              AND (:noteId IS NULL OR t.noteId = :noteId)
            ORDER BY t.doneAt DESC""")
    List<Todo> done(UUID assigneeId, boolean unassigned, UUID taskId, UUID noteId, Limit limit);

    /** The to-do ordering a position of the shopping list (FB-20) – at most one */
    Optional<Todo> findByShoppingItemId(UUID shoppingItemId);

    /** The open sub-tasks of a note – ticked off when the note is archived. */
    List<Todo> findByNoteIdAndDoneAtIsNull(UUID noteId);

    /** The sub-tasks of a note ticked off at that moment – reopened when the note is reactivated. */
    List<Todo> findByNoteIdAndDoneAt(UUID noteId, Instant doneAt);

    /** Per note: how many sub-tasks, how many of them done – for the note cards. */
    @Query("""
            SELECT t.noteId AS noteId, count(t) AS total, count(t.doneAt) AS done FROM Todo t
            WHERE t.noteId IN :noteIds GROUP BY t.noteId""")
    List<NoteTodoCount> countByNote(Collection<UUID> noteIds);

    /** Result row of {@link #countByNote} */
    interface NoteTodoCount {
        UUID getNoteId();

        long getTotal();

        long getDone();
    }
}
