package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.supplier.Supplier;
import ch.kruegel.workshop.supplier.SupplierDeleting;
import ch.kruegel.workshop.supplier.SupplierRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    private final SupplierRepository suppliers;
    private final ApplicationEventPublisher events;

    StockItemService(StockItemRepository repository, StorageLocationRepository locations, SupplierRepository suppliers,
                     ApplicationEventPublisher events) {
        this.repository = repository;
        this.locations = locations;
        this.suppliers = suppliers;
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

    /** A supplier is about to be deleted: its articles let go of it (same transaction). */
    @EventListener
    void onSupplierDeleting(SupplierDeleting event) {
        repository.findBySupplier(event.supplierId()).forEach(item -> item.dropSupplier(event.supplierId()));
        repository.flush();
    }

    private StockItemDetails details(StockItemRequest request, StorageLocation current) {
        return new StockItemDetails(request.name(), request.category(), request.articleNumber(), request.manufacturer(),
                request.quantity(), location(request.storageLocationId(), current), request.remark(),
                supplierLinks(request.suppliers()));
    }

    private List<StockItemSupplier> supplierLinks(List<StockItemRequest.SupplierRef> refs) {
        if (refs == null) {
            return List.of();
        }
        Set<UUID> seen = new HashSet<>();
        return refs.stream().map(ref -> {
            if (!seen.add(ref.supplierId())) {
                throw new InvalidInputException("suppliers", "Jeder Lieferant nur einmal pro Artikel");
            }
            Supplier supplier = suppliers.findById(ref.supplierId())
                    .orElseThrow(() -> new InvalidInputException("suppliers", "Diesen Lieferanten gibt es nicht"));
            return new StockItemSupplier(supplier, ref.articleNumber());
        }).toList();
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
