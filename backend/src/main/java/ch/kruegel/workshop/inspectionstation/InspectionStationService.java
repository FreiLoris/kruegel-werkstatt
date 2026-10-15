package ch.kruegel.workshop.inspectionstation;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Inspection stations (FB-10): list, create, edit, choose the standard, deactivate. Names are unique
 * (ignoring case) – also among the deactivated ones, so one can always be activated again. Exactly
 * one station is the standard, and it stays in use.
 */
@Service
@Transactional
public class InspectionStationService {

    static final String TOPIC = "inspection-stations";

    private final InspectionStationRepository repository;
    private final ApplicationEventPublisher events;

    InspectionStationService(InspectionStationRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    /** All, the standard first, then by name – also the deactivated ones: the frontend needs them for old tasks. */
    @Transactional(readOnly = true)
    public List<InspectionStationDto> list() {
        return repository.findAllStandardFirst().stream().map(InspectionStationDto::of).toList();
    }

    public InspectionStationDto create(InspectionStationRequest request) {
        String name = request.name().strip();
        if (repository.existsByNameIgnoreCase(name)) {
            throw nameTaken(name);
        }
        return saved(repository.save(new InspectionStation(name, request.address(), request.phone(), request.minutes())));
    }

    public InspectionStationDto update(UUID id, InspectionStationRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        InspectionStation station = find(id);
        station.checkVersion(request.version());
        String name = request.name().strip();
        // check first, then change (Hibernate "auto flush", see LiftService#rename)
        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw nameTaken(name);
        }
        station.update(name, request.address(), request.phone(), request.minutes());
        return saved(station);
    }

    /** Preset on new tasks from now on – instead of the one so far. */
    public InspectionStationDto makeStandard(UUID id) {
        InspectionStation station = find(id);
        if (!station.isActive()) {
            throw new BusinessRuleException("Eine nicht mehr verwendete Prüfstelle kann nicht Standard sein.");
        }
        repository.findStandard().filter(old -> !old.equals(station)).ifPresent(old -> {
            old.markAsStandard(false);
            // the unique index allows one standard at a time
            repository.flush();
        });
        station.markAsStandard(true);
        return saved(station);
    }

    /** No longer offered on a task; tasks that name it keep it. The standard stays in use. */
    public InspectionStationDto deactivate(UUID id) {
        InspectionStation station = find(id);
        if (station.isStandard()) {
            throw new BusinessRuleException("Die Standard-Prüfstelle bleibt in Gebrauch – zuerst eine andere als Standard wählen.");
        }
        station.deactivate();
        return saved(station);
    }

    public InspectionStationDto activate(UUID id) {
        InspectionStation station = find(id);
        station.activate();
        return saved(station);
    }

    private InspectionStation find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Prüfstelle", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private InspectionStationDto saved(InspectionStation station) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return InspectionStationDto.of(station);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
