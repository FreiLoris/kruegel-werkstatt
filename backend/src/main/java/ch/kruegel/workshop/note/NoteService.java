package ch.kruegel.workshop.note;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.todo.Todo;
import ch.kruegel.workshop.todo.TodoDto;
import ch.kruegel.workshop.todo.TodoRepository;
import ch.kruegel.workshop.todo.TodoRequest;
import ch.kruegel.workshop.todo.TodoService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Pinboard notes: list, create, edit, archive/reactivate, delete, add sub-tasks.
 *
 * <p>Archiving ticks off the open sub-tasks at exactly the archive moment; reactivating reopens
 * exactly those – the old app did not undo it symmetrically. Sub-tasks ticked off before stay done.
 */
@Service
@Transactional
public class NoteService {

    public static final String TOPIC = "notes";
    /** How many archived notes a list shows at most – the latest */
    static final int ARCHIVE_LIMIT = 200;

    private final NoteRepository repository;
    private final EmployeeRepository employees;
    private final TaskRepository tasks;
    private final TodoRepository todos;
    private final TodoService todoService;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    NoteService(NoteRepository repository, EmployeeRepository employees, TaskRepository tasks, TodoRepository todos,
                TodoService todoService, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.employees = employees;
        this.tasks = tasks;
        this.todos = todos;
        this.todoService = todoService;
        this.events = events;
        this.clock = clock;
    }

    /**
     * @param archived   false = on the board (newest first); true = the archive (latest put away first)
     * @param assigneeId board only: this person's notes
     * @param unassigned board only: notes nobody takes care of yet
     * @param taskId     only those about this task
     * @param query      archive only: words in text or info
     */
    @Transactional(readOnly = true)
    public List<NoteDto> list(boolean archived, UUID assigneeId, boolean unassigned, UUID taskId, String query) {
        List<Note> found = archived
                ? repository.archived(taskId, pattern(query), Limit.of(ARCHIVE_LIMIT))
                : repository.open(assigneeId, unassigned, taskId);
        return withCounts(found);
    }

    @Transactional(readOnly = true)
    public NoteDto get(UUID id) {
        return withCounts(List.of(find(id))).getFirst();
    }

    public NoteDto create(NoteRequest request) {
        Note note = repository.save(new Note(details(request, null)));
        return saved(note);
    }

    public NoteDto update(UUID id, NoteRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Note note = find(id);
        note.checkVersion(request.version());
        note.update(details(request, note));
        return saved(note);
    }

    /**
     * Archive (its open sub-tasks are ticked off with it) or reactivate (exactly those are open again).
     * No version needed – like ticking off a to-do.
     */
    public NoteDto setArchived(UUID id, boolean archived) {
        Note note = find(id);
        if (archived && !note.isArchived()) {
            // whole microseconds: the database keeps no more, the moment must match again on reactivation
            Instant now = Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
            UUID by = CurrentPerson.id().orElse(null);
            todos.findByNoteIdAndDoneAtIsNull(id).forEach(todo -> todo.markDone(now, by));
            note.archive(now);
        } else if (!archived && note.isArchived()) {
            todos.findByNoteIdAndDoneAt(id, note.getArchivedAt()).forEach(Todo::reopen);
            note.reactivate();
        }
        NoteDto dto = saved(note);
        events.publishEvent(new DataChanged(TodoService.TOPIC));
        return dto;
    }

    /**
     * Drag & drop on the pinboard: from one person's column (empty = "Neu") to another's. No version
     * needed – like moving a task, it must not fail because someone edited the text meanwhile.
     */
    public NoteDto move(UUID id, UUID fromEmployeeId, UUID toEmployeeId) {
        Note note = find(id);
        if (note.isArchived()) {
            throw new BusinessRuleException("Die Notiz ist archiviert – zuerst wieder auf die Pinnwand holen.");
        }
        Set<Employee> current = note.getAssignees();
        Employee from = fromEmployeeId == null ? null
                : current.stream().filter(e -> e.getId().equals(fromEmployeeId)).findFirst().orElse(null);
        Employee to = toEmployeeId == null ? null : assignee(toEmployeeId, current, "toEmployeeId");
        note.reassign(from, to);
        return saved(note);
    }

    /** Deleted for good, with its sub-tasks (normally a note is archived). */
    public void delete(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        events.publishEvent(new DataChanged(TodoService.TOPIC));
    }

    /** A sub-task: an ordinary to-do that knows its note – it appears in the to-do lists too. */
    public TodoDto addTodo(UUID id, TodoRequest request) {
        Note note = find(id);
        if (note.isArchived()) {
            throw new BusinessRuleException("Die Notiz ist archiviert – zuerst wieder auf die Pinnwand holen.");
        }
        TodoDto todo = todoService.createForNote(id, request);
        events.publishEvent(new DataChanged(TOPIC));
        return todo;
    }

    private NoteDetails details(NoteRequest request, Note current) {
        Set<Employee> currentPeople = current == null ? Set.of() : current.getAssignees();
        Set<Employee> people = new HashSet<>();
        for (UUID personId : request.assigneeIds() == null ? List.<UUID>of() : request.assigneeIds()) {
            people.add(assignee(personId, currentPeople, "assigneeIds"));
        }
        return new NoteDetails(request.text(), request.info(), people, task(request.taskId(), current == null ? null : current.getTask()));
    }

    /** A person already on the note stays valid; a newly chosen one must be active and selectable. */
    private Employee assignee(UUID id, Set<Employee> current, String field) {
        for (Employee employee : current) {
            if (employee.getId().equals(id)) {
                return employee;
            }
        }
        Employee employee = employees.findById(id).orElseThrow(() -> new InvalidInputException(field, "Diese Person gibt es nicht"));
        if (!employee.isActive() || !employee.isSelectableForTodos()) {
            throw new InvalidInputException(field, employee.getName() + " ist für Notizen nicht wählbar");
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

    /** "brems" → "%brems%" – % and _ typed by the user are taken literally */
    private static String pattern(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String escaped = query.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private List<NoteDto> withCounts(List<Note> notes) {
        if (notes.isEmpty()) {
            return List.of();
        }
        Map<UUID, NoteDto.TodoCount> counts = todos.countByNote(notes.stream().map(Note::getId).toList()).stream()
                .collect(Collectors.toMap(TodoRepository.NoteTodoCount::getNoteId, c -> new NoteDto.TodoCount(c.getTotal(), c.getDone())));
        return notes.stream().map(n -> NoteDto.of(n, counts.getOrDefault(n.getId(), NoteDto.TodoCount.NONE))).toList();
    }

    private Note find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Notiz", id));
    }

    private NoteDto saved(Note note) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return withCounts(List.of(note)).getFirst();
    }
}
