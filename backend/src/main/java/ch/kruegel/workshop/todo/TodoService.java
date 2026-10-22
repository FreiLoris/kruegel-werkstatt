package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * To-dos: list, create, edit, done/undo, delete.
 *
 * <p>A newly chosen person must be active and selectable for to-dos; a person already on the
 * to-do stays valid (an old to-do stays editable after someone left).
 */
@Service
@Transactional
public class TodoService {

    public static final String TOPIC = "todos";
    /**
     * The note shows how many of its sub-tasks are done (FB-03): a changed sub-task changes the
     * note too. Same value as {@code NoteService.TOPIC} – a copy, because the note package already
     * uses this one and a reference back would be a cycle.
     */
    private static final String NOTES_TOPIC = "notes";
    /** How many done to-dos a list shows at most – the newest */
    static final int DONE_LIMIT = 200;

    private final TodoRepository repository;
    private final EmployeeRepository employees;
    private final TaskRepository tasks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TodoService(TodoRepository repository, EmployeeRepository employees, TaskRepository tasks, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.employees = employees;
        this.tasks = tasks;
        this.events = events;
        this.clock = clock;
    }

    /**
     * @param done       false = open ones by deadline; true = the latest done ones
     * @param assigneeId only this person's; empty = everyone's
     * @param unassigned only those nobody takes care of yet
     * @param taskId     only those of this task; empty = all
     * @param noteId     only the sub-tasks of this note; empty = all
     */
    @Transactional(readOnly = true)
    public List<TodoDto> list(boolean done, UUID assigneeId, boolean unassigned, UUID taskId, UUID noteId) {
        List<Todo> found = done
                ? repository.done(assigneeId, unassigned, taskId, noteId, Limit.of(DONE_LIMIT))
                : repository.open(assigneeId, unassigned, taskId, noteId);
        return found.stream().map(TodoDto::of).toList();
    }

    public TodoDto create(TodoRequest request) {
        return saved(repository.save(new Todo(details(request, null))));
    }

    /**
     * A sub-task of a note (pinboard) – the note checks that it exists and is not archived.
     * Without task of its own: the note has the task.
     */
    public TodoDto createForNote(UUID noteId, TodoRequest request) {
        TodoRequest withoutTask = new TodoRequest(request.text(), request.assigneeId(), request.dueDate(), null, null);
        return saved(repository.save(new Todo(details(withoutTask, null), noteId)));
    }

    public TodoDto update(UUID id, TodoRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Todo todo = find(id);
        notOfShoppingList(todo);
        todo.checkVersion(request.version());
        todo.update(details(request, todo));
        return saved(todo);
    }

    /**
     * Tick off or "undo" – no version needed: ticking off must not fail because someone else
     * changed the text meanwhile (like the task status).
     */
    public TodoDto setDone(UUID id, boolean done) {
        Todo todo = find(id);
        if (done && !todo.isDone()) {
            todo.markDone(Instant.now(clock), CurrentPerson.id().orElse(null));
        } else if (!done) {
            todo.reopen();
        }
        shoppingTodoChanged(todo);
        return saved(todo);
    }

    /**
     * Someone else takes care of it – dragged to another column on the pinboard. No version needed,
     * like ticking off: it must not fail because someone edited the text meanwhile.
     */
    public TodoDto reassign(UUID id, UUID assigneeId) {
        Todo todo = find(id);
        if (todo.getShoppingItemId() != null && assigneeId == null) {
            // without someone who orders there is no to-do – that is cleared on the position
            throw new BusinessRuleException("Wer bestellt, wird auf der Einkaufsliste geleert – dort «Bestellen durch» ändern.");
        }
        todo.reassign(assignee(assigneeId, todo.getAssignee()));
        shoppingTodoChanged(todo);
        return saved(todo);
    }

    public void delete(UUID id) {
        Todo todo = find(id);
        notOfShoppingList(todo);
        repository.delete(todo);
        repository.flush();
        changed(todo);
    }

    /**
     * The to-do ordering a position of the shopping list says what the position says (FB-20) – text and
     * existence follow the position; only ticking off and giving it to someone else work from here.
     */
    private static void notOfShoppingList(Todo todo) {
        if (todo.getShoppingItemId() != null) {
            throw new BusinessRuleException("Dieses To-do gehört zu einer Position der Einkaufsliste – dort ändern oder löschen.");
        }
    }

    /** The to-do of a shopping list position ticked or given to someone else – the position follows (FB-20). */
    private void shoppingTodoChanged(Todo todo) {
        if (todo.getShoppingItemId() != null) {
            UUID assigneeId = todo.getAssignee() == null ? null : todo.getAssignee().getId();
            events.publishEvent(new ShoppingTodoChanged(todo.getShoppingItemId(), todo.isDone(), assigneeId));
        }
    }

    private TodoDetails details(TodoRequest request, Todo current) {
        Employee assignee = assignee(request.assigneeId(), current == null ? null : current.getAssignee());
        Task task = task(request.taskId(), current == null ? null : current.getTask());
        return new TodoDetails(request.text(), assignee, request.dueDate(), task);
    }

    private Employee assignee(UUID id, Employee current) {
        if (id == null) {
            return null;
        }
        if (current != null && id.equals(current.getId())) {
            return current;
        }
        Employee employee = employees.findById(id).orElseThrow(() -> new InvalidInputException("assigneeId", "Diese Person gibt es nicht"));
        if (!employee.isActive() || !employee.isSelectableForTodos()) {
            throw new InvalidInputException("assigneeId", employee.getName() + " ist für To-dos nicht wählbar");
        }
        return employee;
    }

    private Task task(UUID id, Task current) {
        if (id == null) {
            return null;
        }
        if (current != null && id.equals(current.getId())) {
            return current;
        }
        return tasks.findById(id).orElseThrow(() -> new InvalidInputException("taskId", "Diesen Auftrag gibt es nicht"));
    }

    private Todo find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("To-do", id));
    }

    private TodoDto saved(Todo todo) {
        repository.flush();
        changed(todo);
        return TodoDto.of(todo);
    }

    private void changed(Todo todo) {
        events.publishEvent(new DataChanged(TOPIC));
        if (todo.getNoteId() != null) {
            events.publishEvent(new DataChanged(NOTES_TOPIC));
        }
    }
}
