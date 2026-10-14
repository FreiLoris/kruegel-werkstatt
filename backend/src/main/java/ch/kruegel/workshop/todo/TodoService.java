package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.stock.StockItemRepository;
import ch.kruegel.workshop.supplier.SupplierRepository;
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
    private final StockItemRepository stockItems;
    private final SupplierRepository suppliers;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TodoService(TodoRepository repository, EmployeeRepository employees, TaskRepository tasks, StockItemRepository stockItems,
                SupplierRepository suppliers, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.employees = employees;
        this.tasks = tasks;
        this.stockItems = stockItems;
        this.suppliers = suppliers;
        this.events = events;
        this.clock = clock;
    }

    /**
     * @param done       false = open ones by deadline; true = the latest done ones
     * @param assigneeId only this person's; empty = everyone's
     * @param unassigned only those nobody takes care of yet
     * @param shopping   only the shopping list (true) or only the rest (false); empty = both
     * @param taskId     only those of this task; empty = all
     * @param noteId     only the sub-tasks of this note; empty = all
     */
    @Transactional(readOnly = true)
    public List<TodoDto> list(boolean done, UUID assigneeId, boolean unassigned, Boolean shopping, UUID taskId, UUID noteId) {
        List<Todo> found = done
                ? repository.done(assigneeId, unassigned, shopping, taskId, noteId, Limit.of(DONE_LIMIT))
                : repository.open(assigneeId, unassigned, shopping, taskId, noteId);
        return found.stream().map(TodoDto::of).toList();
    }

    public TodoDto create(TodoRequest request) {
        Todo todo = new Todo(details(request, null));
        purchase(todo, request);
        return saved(repository.save(todo));
    }

    /**
     * A sub-task of a note (pinboard) – the note checks that it exists and is not archived.
     * Without task of its own: the note has the task.
     */
    public TodoDto createForNote(UUID noteId, TodoRequest request) {
        TodoRequest withoutTask = new TodoRequest(request.text(), request.assigneeId(), request.dueDate(), request.shopping(), null,
                request.stockItemId(), request.supplierId(), null);
        Todo todo = new Todo(details(withoutTask, null), noteId);
        purchase(todo, withoutTask);
        return saved(repository.save(todo));
    }

    public TodoDto update(UUID id, TodoRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Todo todo = find(id);
        todo.checkVersion(request.version());
        todo.update(details(request, todo));
        purchase(todo, request);
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
        return saved(todo);
    }

    /**
     * Someone else takes care of it – dragged to another column on the pinboard. No version needed,
     * like ticking off: it must not fail because someone edited the text meanwhile.
     */
    public TodoDto reassign(UUID id, UUID assigneeId) {
        Todo todo = find(id);
        todo.reassign(assignee(assigneeId, todo.getAssignee()));
        return saved(todo);
    }

    public void delete(UUID id) {
        Todo todo = find(id);
        repository.delete(todo);
        repository.flush();
        changed(todo);
    }

    /** Article and supplier of a shopping list entry – both must exist (13g) */
    private void purchase(Todo todo, TodoRequest request) {
        if (request.stockItemId() != null && !request.stockItemId().equals(todo.getStockItemId())
                && !stockItems.existsById(request.stockItemId())) {
            throw new InvalidInputException("stockItemId", "Diesen Artikel gibt es nicht");
        }
        if (request.supplierId() != null && !request.supplierId().equals(todo.getSupplierId())
                && !suppliers.existsById(request.supplierId())) {
            throw new InvalidInputException("supplierId", "Diesen Lieferanten gibt es nicht");
        }
        todo.purchase(request.stockItemId(), request.supplierId());
    }

    private TodoDetails details(TodoRequest request, Todo current) {
        Employee assignee = assignee(request.assigneeId(), current == null ? null : current.getAssignee());
        Task task = task(request.taskId(), current == null ? null : current.getTask());
        return new TodoDetails(request.text(), assignee, request.dueDate(), request.shopping(), task);
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
