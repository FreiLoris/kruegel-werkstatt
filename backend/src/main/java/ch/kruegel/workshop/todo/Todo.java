package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.task.Task;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * A to-do: something someone has to do – call back, check a lift. Ordering a position of the shopping
 * list is one too: its to-do knows the position (FB-20).
 * Always created and changed through {@link TodoDetails}; done/undone on its own.
 */
@Entity
public class Todo extends BaseEntity {

    public static final int TEXT_MAX = 500;

    @Column(nullable = false)
    private String text;

    @ManyToOne(fetch = FetchType.LAZY)
    private Employee assignee;

    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    /**
     * The note this is a sub-task of (pinboard, 8c) – only the ID: the note knows its to-dos,
     * a to-do does not need the note (no package cycle). Set once, never changed.
     */
    private UUID noteId;

    private Instant doneAt;

    private UUID doneBy;

    /**
     * The position of the shopping list this is the order of ("Bestellen durch", FB-20) – only the ID,
     * like the note. Ticked off = ordered. Set once, never changed.
     */
    private UUID shoppingItemId;

    protected Todo() {
        // for JPA
    }

    public Todo(TodoDetails details) {
        apply(details);
    }

    /** A sub-task of a note: an ordinary to-do that knows its note (bug #10: no second list). */
    public Todo(TodoDetails details, UUID noteId) {
        this(details);
        this.noteId = Objects.requireNonNull(noteId, "noteId");
    }

    /** The order of a position of the shopping list – for the person who orders it (FB-20). */
    public static Todo forShoppingItem(TodoDetails details, UUID shoppingItemId) {
        Todo todo = new Todo(details);
        todo.shoppingItemId = Objects.requireNonNull(shoppingItemId, "shoppingItemId");
        return todo;
    }

    public void update(TodoDetails details) {
        apply(details);
    }

    /** Someone else takes care of it (dragged on the pinboard); empty = nobody yet. */
    public void reassign(Employee assignee) {
        this.assignee = assignee;
    }

    /** Ticked off – remembers when and by whom (empty when no person is known, e.g. sample data). */
    public void markDone(Instant at, UUID by) {
        this.doneAt = Objects.requireNonNull(at, "at");
        this.doneBy = by;
    }

    /** Ticked off by mistake ("undo") – open again. */
    public void reopen() {
        this.doneAt = null;
        this.doneBy = null;
    }

    private void apply(TodoDetails details) {
        this.text = details.text();
        this.assignee = details.assignee();
        this.dueDate = details.dueDate();
        this.task = details.task();
    }

    public TodoDetails getDetails() {
        return new TodoDetails(text, assignee, dueDate, task);
    }

    public String getText() {
        return text;
    }

    public Employee getAssignee() {
        return assignee;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Task getTask() {
        return task;
    }

    public UUID getNoteId() {
        return noteId;
    }

    public Instant getDoneAt() {
        return doneAt;
    }

    public UUID getDoneBy() {
        return doneBy;
    }

    public boolean isDone() {
        return doneAt != null;
    }

    public UUID getShoppingItemId() {
        return shoppingItemId;
    }
}
