package ch.kruegel.workshop.note;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * A pinboard note: an internal message for one or more people, optionally about a task.
 * Archived instead of deleted. Its sub-tasks are to-dos (see {@code Todo#getNoteId()}).
 */
@Entity
public class Note extends BaseEntity {

    public static final int TEXT_MAX = 2000;
    public static final int INFO_MAX = 4000;

    @Column(nullable = false)
    private String text;

    private String info;

    @ManyToMany
    @JoinTable(name = "note_assignee",
            joinColumns = @JoinColumn(name = "note_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id"))
    // the board shows many notes: load the people of 50 notes in one go instead of one by one
    @BatchSize(size = 50)
    private Set<Employee> assignees = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    private Instant archivedAt;

    protected Note() {
        // for JPA
    }

    public Note(NoteDetails details) {
        apply(details);
    }

    public void update(NoteDetails details) {
        apply(details);
    }

    /** Put away – the caller ticks off the open sub-tasks at the same moment. */
    public void archive(Instant at) {
        this.archivedAt = Objects.requireNonNull(at, "at");
    }

    /** Back on the board. */
    public void reactivate() {
        this.archivedAt = null;
    }

    private void apply(NoteDetails details) {
        this.text = details.text();
        this.info = details.info();
        this.assignees = new HashSet<>(details.assignees());
        this.task = details.task();
    }

    public String getText() {
        return text;
    }

    public String getInfo() {
        return info;
    }

    public Set<Employee> getAssignees() {
        return Set.copyOf(assignees);
    }

    public Task getTask() {
        return task;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public boolean isArchived() {
        return archivedAt != null;
    }
}
