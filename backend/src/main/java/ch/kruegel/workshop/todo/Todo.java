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
 * A to-do: something someone has to do – call back, order parts, buy coffee (shopping list).
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

    private boolean shopping;

    @ManyToOne(fetch = FetchType.LAZY)
    private Task task;

    private Instant doneAt;

    private UUID doneBy;

    protected Todo() {
        // for JPA
    }

    public Todo(TodoDetails details) {
        apply(details);
    }

    public void update(TodoDetails details) {
        apply(details);
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
        this.shopping = details.shopping();
        this.task = details.task();
    }

    public TodoDetails getDetails() {
        return new TodoDetails(text, assignee, dueDate, shopping, task);
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

    public boolean isShopping() {
        return shopping;
    }

    public Task getTask() {
        return task;
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
}
