package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.stock.StockItemRepository;
import ch.kruegel.workshop.supplier.SupplierRepository;
import ch.kruegel.workshop.task.NewTiresChosen;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.todo.ShoppingTodoChanged;
import ch.kruegel.workshop.todo.Todo;
import ch.kruegel.workshop.todo.TodoDetails;
import ch.kruegel.workshop.todo.TodoRepository;
import ch.kruegel.workshop.todo.TodoService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * The shopping list (FB-20, FB-19): positions with their history. "Bestellen durch" gets a to-do
 * linked to the position, open while we are up (FB-28: to order, give the supplier information,
 * decide on the quote) – done while the supplier is up and once it is ordered; ticked off moves the
 * position on, and back – both ways.
 */
@Service
@Transactional
public class ShoppingService {

    public static final String TOPIC = "shopping-items";
    /** How many done positions (arrived or cancelled) the list shows at most – the latest */
    static final int DONE_LIMIT = 200;
    /** The position of new tyres for a task (FB-25) starts so */
    private static final String NEW_TIRES_PREFIX = "Reifen ";

    private final ShoppingItemRepository repository;
    private final EmployeeRepository employees;
    private final TaskRepository tasks;
    private final StockItemRepository stockItems;
    private final SupplierRepository suppliers;
    private final TodoRepository todos;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    ShoppingService(ShoppingItemRepository repository, EmployeeRepository employees, TaskRepository tasks, StockItemRepository stockItems,
                    SupplierRepository suppliers, TodoRepository todos, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.employees = employees;
        this.tasks = tasks;
        this.stockItems = stockItems;
        this.suppliers = suppliers;
        this.todos = todos;
        this.events = events;
        this.clock = clock;
    }

    /**
     * @param arrived false = open (not ordered yet first); true = the latest done ones (arrived or cancelled)
     * @param taskId  all positions of this task, whatever their state (then {@code arrived} does not count)
     * @param taskIds all positions of these tasks, whatever their state
     */
    @Transactional(readOnly = true)
    public List<ShoppingItemDto> list(boolean arrived, UUID taskId, List<UUID> taskIds) {
        List<ShoppingItem> found = taskId != null ? repository.ofTask(taskId)
                : taskIds != null ? (taskIds.isEmpty() ? List.of() : repository.ofTasks(taskIds))
                : arrived ? repository.done(Limit.of(DONE_LIMIT)) : repository.open();
        return found.stream().map(ShoppingItemDto::of).toList();
    }

    @Transactional(readOnly = true)
    public ShoppingItemDto get(UUID id) {
        return ShoppingItemDto.of(find(id));
    }

    /** Oldest first */
    @Transactional(readOnly = true)
    public List<ShoppingEntryDto> entries(UUID id) {
        return find(id).getEntries().stream().map(ShoppingEntryDto::of).toList();
    }

    public ShoppingItemDto create(ShoppingItemRequest request) {
        ShoppingStatus status = request.status() == null ? ShoppingStatus.TO_ORDER : request.status();
        ShoppingItem item = repository.save(new ShoppingItem(details(request, null), status, today()));
        syncTodo(item);
        return saved(item);
    }

    public ShoppingItemDto update(UUID id, ShoppingItemRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        ShoppingItem item = find(id);
        item.checkVersion(request.version());
        ShoppingStatus before = item.getStatus();
        item.update(details(request, item), request.status(), today());
        // FB-28: a short note with a change of state, right after it in the history – in the same save
        if (item.getStatus() != before && request.statusNote() != null && !request.statusNote().isBlank()) {
            item.addNote(request.statusNote());
        }
        syncTodo(item);
        return saved(item);
    }

    /** Another state – no version needed, like ticking off a to-do. */
    public ShoppingItemDto changeStatus(UUID id, ShoppingStatus status) {
        ShoppingItem item = find(id);
        if (item.changeStatus(status, today())) {
            syncTodo(item);
        }
        return saved(item);
    }

    public ShoppingEntryDto addNote(UUID id, String text) {
        ShoppingItem item = find(id);
        item.addNote(text);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return ShoppingEntryDto.of(item.getEntries().getLast());
    }

    /** Its to-do goes with it (database: ON DELETE CASCADE). */
    public void delete(UUID id) {
        ShoppingItem item = find(id);
        todos.findByShoppingItemId(id).ifPresent(todos::delete);
        repository.delete(item);
        repository.flush();
        changed();
    }

    /**
     * New tyres for a task (FB-25): "Reifen 205/55 R16 91H", to order – recorded and ordered by who
     * took the order, like a part entered with the task (FB-24); all changeable on the list.
     * <pre>
     *   kind newly chosen, no tyre position (or only cancelled ones) → a new position
     *   kind chosen again, a position not cancelled                  → it is still the one
     *   what to order changed, the position as the task left it:
     *     still to order, no number or article chosen               → it follows (noted in its history)
     *   anything else (changed by hand, asked for, ordered, arrived) → a note "bitte prüfen"
     * </pre>
     * Nothing changed by hand or already ordered is overwritten, and a renamed position is not
     * ordered a second time.
     */
    @EventListener
    void onNewTiresChosen(NewTiresChosen event) {
        String description = newTiresDescription(event.dimension());
        Optional<ShoppingItem> existing = repository.ofTask(event.taskId()).stream()
                .filter(item -> item.getStatus() != ShoppingStatus.CANCELLED && item.getDetails().description().startsWith(NEW_TIRES_PREFIX))
                .findFirst();
        if (existing.isEmpty()) {
            if (event.newlyChosen()) {
                create(new ShoppingItemRequest(description, null, event.count(), ShoppingStatus.TO_ORDER, event.acceptedBy(), event.acceptedBy(),
                        event.taskId(), null, null, null, null, null, null));
            }
            return;
        }
        ShoppingItem item = existing.get();
        ShoppingItemDetails d = item.getDetails();
        if (event.newlyChosen() || d.description().equals(description) && d.quantity() == event.count()) {
            return;
        }
        boolean asTheTaskLeftIt = d.description().equals(newTiresDescription(event.dimensionBefore()))
                && Integer.valueOf(d.quantity()).equals(event.countBefore()) && d.partNumber() == null && d.stockItemId() == null;
        String what = quantityPrefix(event.count()) + description;
        if (item.getStatus() == ShoppingStatus.TO_ORDER && asTheTaskLeftIt) {
            item.update(d.withOrder(description, event.count()), null, today());
            item.addNote("Vom Auftrag übernommen: " + what);
            syncTodo(item);
        } else {
            item.addNote("Auftrag geändert auf " + what + " – bitte prüfen");
        }
        repository.flush();
        changed();
    }

    private static String newTiresDescription(String dimension) {
        return NEW_TIRES_PREFIX + (dimension == null ? "(Dimension offen)" : dimension);
    }

    /** "2× " – nothing for one, like the to-do */
    private static String quantityPrefix(int quantity) {
        return quantity == 1 ? "" : quantity + "× ";
    }

    /**
     * The to-do was ticked off, undone or given to someone else – the position follows: done moves it
     * on ({@link ShoppingStatus#afterTodoDone()}), undone goes back to where we were up last – also
     * when it was marked arrived: the to-do is open again. Its text follows the state.
     */
    @EventListener
    void onTodoChanged(ShoppingTodoChanged event) {
        repository.findById(event.shoppingItemId()).ifPresent(item -> {
            ShoppingStatus status = item.getStatus();
            if (event.done() && status.isOurTurn()) {
                item.changeStatus(status.afterTodoDone(), today());
            } else if (!event.done() && !status.isOurTurn()) {
                item.changeStatus(item.lastOurTurn(), today());
            }
            // the text only – no event, so no loop back here
            todos.findByShoppingItemId(item.getId()).ifPresent(todo -> todo.update(todoDetails(item, todo.getDueDate())));
            Employee orderBy = item.getOrderBy();
            if (!Objects.equals(orderBy == null ? null : orderBy.getId(), event.assigneeId())) {
                item.reassign(event.assigneeId() == null ? null : employees.getReferenceById(event.assigneeId()));
            }
            events.publishEvent(new DataChanged(TOPIC));
        });
    }

    /**
     * The to-do of "Bestellen durch" follows the position:
     * <pre>
     *   nobody orders                          → no to-do
     *   we are up (to order, Rückfrage, quote) → a to-do, open – its text says what to do
     *   the supplier is up, ordered, done      → the to-do done (a new one is not created for it)
     * </pre>
     * Its task is the task.
     */
    private void syncTodo(ShoppingItem item) {
        Optional<Todo> existing = todos.findByShoppingItemId(item.getId());
        if (item.getOrderBy() == null) {
            existing.ifPresent(todos::delete);
            return;
        }
        boolean ourTurn = item.getStatus().isOurTurn();
        Todo todo = existing.orElse(null);
        if (todo == null) {
            if (!ourTurn) {
                return; // nothing to do for anybody
            }
            todo = todos.save(Todo.forShoppingItem(todoDetails(item, null), item.getId()));
        } else {
            todo.update(todoDetails(item, todo.getDueDate()));
        }
        if (!ourTurn && !todo.isDone()) {
            todo.markDone(clock.instant(), CurrentPerson.id().orElse(null));
        } else if (ourTurn && todo.isDone()) {
            todo.reopen();
        }
    }

    /** "Bestellen: 2× Bremsscheiben vorne (Nr. 0986479S27)" – what to do in its state */
    private static TodoDetails todoDetails(ShoppingItem item, LocalDate dueDate) {
        ShoppingItemDetails d = item.getDetails();
        String what = switch (item.getStatus()) {
            case INFO_NEEDED -> "Infos an Lieferant liefern: ";
            case QUOTE_RECEIVED -> "Offerte prüfen: ";
            case QUOTE_REQUESTED -> "Offerte angefragt: ";
            case CANCELLED -> "Storniert: ";
            case TO_ORDER, ORDERED, ARRIVED -> "Bestellen: ";
        };
        String text = what + (d.quantity() > 1 ? d.quantity() + "× " : "") + d.description()
                + (d.partNumber() == null ? "" : " (Nr. " + d.partNumber() + ")");
        return new TodoDetails(text.length() > Todo.TEXT_MAX ? text.substring(0, Todo.TEXT_MAX) : text, d.orderBy(), dueDate, d.task());
    }

    private ShoppingItemDetails details(ShoppingItemRequest request, ShoppingItem current) {
        ShoppingItemDetails before = current == null ? null : current.getDetails();
        Employee recordedBy = person(request.recordedById(), before == null ? null : before.recordedBy(), "recordedById", false);
        Employee orderBy = person(request.orderById(), before == null ? null : before.orderBy(), "orderById", true);
        Task task = task(request.taskId(), before == null ? null : before.task());
        checkExists(request.stockItemId(), before == null ? null : before.stockItemId(), stockItems::existsById, "stockItemId",
                "Diesen Artikel gibt es nicht");
        checkExists(request.supplierId(), before == null ? null : before.supplierId(), suppliers::existsById, "supplierId",
                "Diesen Lieferanten gibt es nicht");
        return new ShoppingItemDetails(request.description(), request.partNumber(), request.quantity(), recordedBy, orderBy, task,
                request.stockItemId(), request.supplierId(), request.orderedOn(), request.expectedOn());
    }

    /**
     * A newly chosen person must be active – the one who orders also selectable for to-dos (they
     * get one). A person already on the position stays valid (an old position stays editable).
     */
    private Employee person(UUID id, Employee current, String field, boolean getsTodo) {
        if (id == null) {
            return null;
        }
        if (current != null && id.equals(current.getId())) {
            return current;
        }
        Employee employee = employees.findById(id).orElseThrow(() -> new InvalidInputException(field, "Diese Person gibt es nicht"));
        if (!employee.isActive() || (getsTodo && !employee.isSelectableForTodos())) {
            throw new InvalidInputException(field, employee.getName() + " ist hier nicht wählbar");
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

    private static void checkExists(UUID id, UUID current, Predicate<UUID> exists, String field, String message) {
        if (id != null && !id.equals(current) && !exists.test(id)) {
            throw new InvalidInputException(field, message);
        }
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    private ShoppingItem find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Position", id));
    }

    private ShoppingItemDto saved(ShoppingItem item) {
        repository.flush();
        changed();
        return ShoppingItemDto.of(item);
    }

    /** The list and the to-dos of the one who orders */
    private void changed() {
        events.publishEvent(new DataChanged(TOPIC));
        events.publishEvent(new DataChanged(TodoService.TOPIC));
    }
}
