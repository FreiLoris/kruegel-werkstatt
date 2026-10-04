package ch.kruegel.workshop.serviceitem;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Administration of service items. Same structure as {@code LiftService}. */
@Service
@Transactional
public class ServiceItemService {

    static final String TOPIC = "service-items";

    private final ServiceItemRepository repository;
    private final ApplicationEventPublisher events;

    ServiceItemService(ServiceItemRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<ServiceItemDto> list(boolean includeInactive) {
        List<ServiceItem> items = includeInactive
                ? repository.findAllByOrderBySortOrderAscNameAsc()
                : repository.findByActiveTrueOrderBySortOrderAscNameAsc();
        return items.stream().map(ServiceItemDto::of).toList();
    }

    public ServiceItemDto create(ServiceItemRequest request) {
        ServiceItem item = new ServiceItem(request.name(), repository.nextSortOrder());
        if (repository.existsByActiveTrueAndNameIgnoreCase(item.getName())) {
            throw nameTaken(item.getName());
        }
        return saved(repository.save(item));
    }

    public ServiceItemDto rename(UUID id, ServiceItemRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        ServiceItem item = find(id);
        item.checkVersion(request.version());
        // Check first, then change: the check query would otherwise write the already changed
        // entity to the database first (Hibernate "auto flush") – and the unique index kicks in.
        String name = request.name().strip();
        if (item.isActive() && repository.existsByActiveTrueAndNameIgnoreCaseAndIdNot(name, id)) {
            throw nameTaken(name);
        }
        item.rename(name);
        return saved(item);
    }

    /**
     * No longer offered: no checkbox on new tasks anymore.
     * Unlike lifts, all of them may be deactivated – a task does not need a service item.
     */
    public ServiceItemDto deactivate(UUID id) {
        ServiceItem item = find(id);
        item.deactivate();
        return saved(item);
    }

    public ServiceItemDto activate(UUID id) {
        ServiceItem item = find(id);
        if (!item.isActive() && repository.existsByActiveTrueAndNameIgnoreCase(item.getName())) {
            throw nameTaken(item.getName());
        }
        item.activate();
        return saved(item);
    }

    /** First ID = top (order of the checkboxes and on the task sheet). */
    public List<ServiceItemDto> reorder(List<UUID> ids) {
        SortOrder.reorder(repository.findAllByOrderBySortOrderAscNameAsc(), ids, "Serviceleistung");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    private ServiceItem find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Serviceleistung", id));
    }

    /** flush → the version in the response is correct; live update to all devices (after commit). */
    private ServiceItemDto saved(ServiceItem item) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return ServiceItemDto.of(item);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name + "' gibt es bereits");
    }
}
