package ch.kruegel.workshop.note;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Database access for notes. The people of a note are loaded in batches ({@code @BatchSize}),
 * not in the graph: a collection fetch together with a limit would be limited in memory.
 */
public interface NoteRepository extends JpaRepository<Note, UUID> {

    /** Notes on the board – newest first. Filters: empty = all. */
    @EntityGraph(attributePaths = {"task", "task.customer"})
    @Query("""
            SELECT n FROM Note n LEFT JOIN n.task k
            WHERE n.archivedAt IS NULL
              AND (:assigneeId IS NULL OR EXISTS (SELECT 1 FROM n.assignees a WHERE a.id = :assigneeId))
              AND (:unassigned = false OR n.assignees IS EMPTY)
              AND (:taskId IS NULL OR k.id = :taskId)
            ORDER BY n.createdAt DESC""")
    List<Note> open(UUID assigneeId, boolean unassigned, UUID taskId);

    /**
     * The archive – put away last first. {@code pattern}: lower case with % around, searched in
     * text and info; empty = all.
     */
    @EntityGraph(attributePaths = {"task", "task.customer"})
    @Query("""
            SELECT n FROM Note n LEFT JOIN n.task k
            WHERE n.archivedAt IS NOT NULL
              AND (:taskId IS NULL OR k.id = :taskId)
              AND (:pattern IS NULL OR lower(n.text) LIKE :pattern ESCAPE '\\' OR lower(n.info) LIKE :pattern ESCAPE '\\')
            ORDER BY n.archivedAt DESC""")
    List<Note> archived(UUID taskId, String pattern, Limit limit);
}
