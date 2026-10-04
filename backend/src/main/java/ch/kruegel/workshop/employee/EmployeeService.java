package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic around employees. Every public method is one transaction:
 * either everything is saved or nothing.
 */
@Service
@Transactional
public class EmployeeService {

    static final String TOPIC = "employees";

    private final EmployeeRepository repository;
    private final ApplicationEventPublisher events;

    EmployeeService(EmployeeRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDto> list(boolean includeInactive) {
        List<Employee> employees = includeInactive
                ? repository.findAllByOrderBySortOrderAscNameAsc()
                : repository.findByActiveTrueOrderBySortOrderAscNameAsc();
        return employees.stream().map(EmployeeDto::of).toList();
    }

    @Transactional(readOnly = true)
    public EmployeeDto get(UUID id) {
        return EmployeeDto.of(find(id));
    }

    public EmployeeDto create(EmployeeRequest request) {
        EmployeeDetails details = request.toDetails();
        if (repository.existsByActiveTrueAndNameIgnoreCase(details.name())) {
            throw nameTaken(details.name());
        }
        Employee employee = repository.save(new Employee(details, repository.nextSortOrder()));
        return saved(employee);
    }

    public EmployeeDto update(UUID id, EmployeeRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Employee employee = find(id);
        employee.checkVersion(request.version());

        // Check first, then change – see "Check before change" in docs/conventions.md
        EmployeeDetails details = request.toDetails();
        if (employee.isActive() && repository.existsByActiveTrueAndNameIgnoreCaseAndIdNot(details.name(), id)) {
            throw nameTaken(details.name());
        }
        employee.update(details);
        return saved(employee);
    }

    /** Person left the business. Kept, but no longer appears in any selection. */
    public EmployeeDto deactivate(UUID id) {
        Employee employee = find(id);
        employee.deactivate();
        return saved(employee);
    }

    public EmployeeDto activate(UUID id) {
        Employee employee = find(id);
        if (!employee.isActive() && repository.existsByActiveTrueAndNameIgnoreCase(employee.getName())) {
            throw nameTaken(employee.getName());
        }
        employee.activate();
        return saved(employee);
    }

    /**
     * Sets the order (pinboard columns, lists): first ID = front.
     * People not in the list follow in their previous order.
     */
    public List<EmployeeDto> reorder(List<UUID> ids) {
        SortOrder.reorder(repository.findAllByOrderBySortOrderAscNameAsc(), ids, "Mitarbeiter");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    private Employee find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Mitarbeiter", id));
    }

    /**
     * Writes the change to the database right away (flush), so the returned {@code version}
     * is already incremented – the device needs it for the next edit.
     * Announces the change to all other devices (sent after commit).
     */
    private EmployeeDto saved(Employee employee) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return EmployeeDto.of(employee);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits bei den aktiven Mitarbeitern");
    }
}
