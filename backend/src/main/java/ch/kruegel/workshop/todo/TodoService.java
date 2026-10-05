package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
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
    /** How many done to-dos a list shows at most – the newest */
    static final int DONE_LIMIT = 200;

    private final TodoRepository repository;
    private final EmployeeRepository employees;
    private final TaskRepository tasks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TodoService(TodoRepository repository, EmployeeRepository employees, TaskRepository tasks,
                ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.employees = employees;
        this.tasks = tasks;
        this.events = events;
        this.clock = clock;
    }

    /**
     * @param done       false = open ones by deadline; true = the latest done ones
     * @param assigneeId only this person's; empty = everyone's
     * @param shopping   only the shopping list (true) or only the rest (false); empty = both
     * @param taskId     only those of this task; empty = all
     */
    @Transactional(readOnly = true)
    public List<TodoDto> list(boolean done, UUID assigneeId, Boolean shopping, UUID taskId) {
        List<Todo> found = done
                ? repository.done(assigneeId, shopping, taskId, Limit.of(DONE_LIMIT))
                : repository.open(assigneeId, shopping, taskId);
        return found.stream().map(TodoDto::of).toList();
    }

    public TodoDto create(TodoRequest request) {
        Todo todo = new Todo(details(request, null));
        return saved(repository.save(todo));
    }

    public TodoDto update(UUID id, TodoRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Todo todo = find(id);
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
        return saved(todo);
    }

    public void delete(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
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
        events.publishEvent(new DataChanged(TOPIC));
        return TodoDto.of(todo);
    }
}
