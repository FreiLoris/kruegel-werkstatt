package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * The stock list: list, create, edit, delete. A newly chosen storage location must be in use; one
 * already on the article stays valid (the article stays editable after its shelf was given up).
 */
@Service
@Transactional
public class StockItemService {

    static final String TOPIC = "stock-items";

    private final StockItemRepository repository;
    private final StorageLocationRepository locations;
    private final ApplicationEventPublisher events;

    StockItemService(StockItemRepository repository, StorageLocationRepository locations, ApplicationEventPublisher events) {
        this.repository = repository;
        this.locations = locations;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<StockItemDto> list() {
        return repository.findAllWithLocation().stream().map(StockItemDto::of).toList();
    }

    public StockItemDto create(StockItemRequest request) {
        return saved(repository.save(new StockItem(details(request, null))));
    }

    public StockItemDto update(UUID id, StockItemRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        StockItem item = find(id);
        item.checkVersion(request.version());
        item.update(details(request, item.getStorageLocation()));
        return saved(item);
    }

    public void delete(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }

    private StockItemDetails details(StockItemRequest request, StorageLocation current) {
        return new StockItemDetails(request.name(), request.category(), request.articleNumber(), request.manufacturer(),
                request.quantity(), location(request.storageLocationId(), current), request.remark());
    }

    private StorageLocation location(UUID id, StorageLocation current) {
        if (id == null) {
            return null;
        }
        if (current != null && id.equals(current.getId())) {
            return current;
        }
        StorageLocation location = locations.findById(id)
                .orElseThrow(() -> new InvalidInputException("storageLocationId", "Diesen Lagerort gibt es nicht"));
        if (!location.isActive()) {
            throw new InvalidInputException("storageLocationId", location.getName() + " wird nicht mehr verwendet");
        }
        return location;
    }

    private StockItem find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Artikel", id));
    }

    private StockItemDto saved(StockItem item) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return StockItemDto.of(item);
    }
}
