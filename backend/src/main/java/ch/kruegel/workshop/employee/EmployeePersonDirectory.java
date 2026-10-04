package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.common.person.PersonDirectory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Persons for "Who am I?" are the active employees. */
@Component
@Transactional(readOnly = true)
class EmployeePersonDirectory implements PersonDirectory {

    private final EmployeeRepository repository;

    EmployeePersonDirectory(EmployeeRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean isActive(UUID id) {
        return repository.existsByIdAndActiveTrue(id);
    }

    @Override
    public boolean anyActive() {
        return repository.existsByActiveTrue();
    }
}
