package ch.kruegel.workshop.note;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
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
     * The archive – put away last first. Every word must occur in text or info, folded like the other
     * searches ({@code search_fold}, V40: "Rueckruf" finds "Rückruf"); no words = all. Only the IDs –
     * SQL because of the word list; the notes come from {@link #findWithTaskByIdIn}.
     */
    @Query(value = """
            SELECT n.id FROM note n
            WHERE n.archived_at IS NOT NULL
              AND (cast(:taskId AS uuid) IS NULL OR n.task_id = cast(:taskId AS uuid))
              AND NOT EXISTS (SELECT 1 FROM unnest(cast(:words AS text[])) AS w(word)
                              WHERE strpos(search_fold(concat_ws(' ', n.text, n.info)), search_fold(w.word)) = 0)
            ORDER BY n.archived_at DESC
            LIMIT :limit""", nativeQuery = true)
    List<UUID> archivedIds(UUID taskId, String[] words, int limit);

    @EntityGraph(attributePaths = {"task", "task.customer"})
    List<Note> findWithTaskByIdIn(Collection<UUID> ids);
}
