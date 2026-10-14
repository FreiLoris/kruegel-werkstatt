package ch.kruegel.workshop.insurance;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Insurances (FB-06): list, create, edit, deactivate. Names are unique (ignoring case) – also among
 * the deactivated ones, so one can always be activated again.
 */
@Service
@Transactional
public class InsuranceService {

    static final String TOPIC = "insurances";

    private final InsuranceRepository repository;
    private final ApplicationEventPublisher events;

    InsuranceService(InsuranceRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    /** All by name, also the deactivated ones – the frontend needs them for old tasks. */
    @Transactional(readOnly = true)
    public List<InsuranceDto> list() {
        return repository.findAllByName().stream().map(InsuranceDto::of).toList();
    }

    public InsuranceDto create(InsuranceRequest request) {
        String name = request.name().strip();
        if (repository.existsByNameIgnoreCase(name)) {
            throw nameTaken(name);
        }
        return saved(repository.save(new Insurance(name, request.phone(), request.email())));
    }

    public InsuranceDto update(UUID id, InsuranceRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Insurance insurance = find(id);
        insurance.checkVersion(request.version());
        String name = request.name().strip();
        // check first, then change (Hibernate "auto flush", see LiftService#rename)
        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw nameTaken(name);
        }
        insurance.update(name, request.phone(), request.email());
        return saved(insurance);
    }

    /** No longer offered in a new insurance case; tasks that name it keep it. */
    public InsuranceDto deactivate(UUID id) {
        Insurance insurance = find(id);
        insurance.deactivate();
        return saved(insurance);
    }

    public InsuranceDto activate(UUID id) {
        Insurance insurance = find(id);
        insurance.activate();
        return saved(insurance);
    }

    private Insurance find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Versicherung", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private InsuranceDto saved(Insurance insurance) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return InsuranceDto.of(insurance);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
