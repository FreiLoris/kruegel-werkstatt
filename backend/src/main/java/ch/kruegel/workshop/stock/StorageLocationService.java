package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Administration of storage locations. Same structure as {@code ServiceItemService}. */
@Service
@Transactional
public class StorageLocationService {

    static final String TOPIC = "storage-locations";

    private final StorageLocationRepository repository;
    private final ApplicationEventPublisher events;

    StorageLocationService(StorageLocationRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<StorageLocationDto> list(boolean includeInactive) {
        List<StorageLocation> locations = includeInactive
                ? repository.findAllByOrderBySortOrderAscNameAsc()
                : repository.findByActiveTrueOrderBySortOrderAscNameAsc();
        return locations.stream().map(StorageLocationDto::of).toList();
    }

    public StorageLocationDto create(StorageLocationRequest request) {
        StorageLocation location = new StorageLocation(request.name(), repository.nextSortOrder());
        if (repository.existsByActiveTrueAndNameIgnoreCase(location.getName())) {
            throw nameTaken(location.getName());
        }
        return saved(repository.save(location));
    }

    public StorageLocationDto rename(UUID id, StorageLocationRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        StorageLocation location = find(id);
        location.checkVersion(request.version());
        // check first, then change (see ServiceItemService#rename – Hibernate "auto flush")
        String name = request.name().strip();
        if (location.isActive() && repository.existsByActiveTrueAndNameIgnoreCaseAndIdNot(name, id)) {
            throw nameTaken(name);
        }
        location.rename(name);
        return saved(location);
    }

    /** No longer used: not offered for new articles; articles that still lie there keep it. */
    public StorageLocationDto deactivate(UUID id) {
        StorageLocation location = find(id);
        location.deactivate();
        return saved(location);
    }

    public StorageLocationDto activate(UUID id) {
        StorageLocation location = find(id);
        if (!location.isActive() && repository.existsByActiveTrueAndNameIgnoreCase(location.getName())) {
            throw nameTaken(location.getName());
        }
        location.activate();
        return saved(location);
    }

    /** First ID = top (filter and form of the stock list). */
    public List<StorageLocationDto> reorder(List<UUID> ids) {
        SortOrder.reorder(repository.findAllByOrderBySortOrderAscNameAsc(), ids, "Lagerort");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    private StorageLocation find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Lagerort", id));
    }

    private StorageLocationDto saved(StorageLocation location) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return StorageLocationDto.of(location);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
