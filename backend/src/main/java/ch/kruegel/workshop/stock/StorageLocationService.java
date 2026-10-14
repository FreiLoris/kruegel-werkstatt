package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.persistence.SortOrder;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Administration of storage locations – a tree (13f). Names are unique among the places in use with
 * the same parent ("Lager" may be under "EG" and "1. OG"). Checked on the whole list in memory: a
 * workshop has a few dozen places, and no query runs between a change and its check (Hibernate
 * "auto flush", see {@code ServiceItemService#rename}).
 */
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

    /** At the end of its level; inside a place in use or at the top level. */
    public StorageLocationDto create(StorageLocationRequest request) {
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        checkParent(all, request.parentId(), null);
        String name = request.name().strip();
        checkNameFree(all, request.parentId(), name, null);
        return saved(repository.save(new StorageLocation(name, request.parentId(), nextSortOrder(all, request.parentId()))));
    }

    public StorageLocationDto rename(UUID id, StorageLocationRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        StorageLocation location = find(all, id);
        location.checkVersion(request.version());
        String name = request.name().strip();
        if (location.isActive()) {
            checkNameFree(all, location.getParentId(), name, id);
        }
        location.rename(name);
        return saved(location);
    }

    /**
     * Into another place or to the top level, at the end there – with everything inside it. Not into
     * itself or one of its own places (that would be a loop).
     */
    public StorageLocationDto move(UUID id, UUID parentId) {
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        StorageLocation location = find(all, id);
        if (Objects.equals(location.getParentId(), parentId)) {
            return StorageLocationDto.of(location);
        }
        if (parentId != null && subtree(all, id).contains(parentId)) {
            throw new InvalidInputException("parentId", "Ein Lagerort kann nicht in sich selbst liegen");
        }
        checkParent(all, parentId, location);
        if (location.isActive()) {
            checkNameFree(all, parentId, location.getName(), id);
        }
        location.moveUnder(parentId, nextSortOrder(all, parentId));
        return saved(location);
    }

    /** No longer used – with everything inside it (a drawer of a cleared shelf is gone too). Articles keep their place. */
    public StorageLocationDto deactivate(UUID id) {
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        StorageLocation location = find(all, id);
        Set<UUID> inside = subtree(all, id);
        all.stream().filter(l -> inside.contains(l.getId())).forEach(StorageLocation::deactivate);
        return saved(location);
    }

    /** Used again – with everything inside it; only inside a place in use. */
    public StorageLocationDto activate(UUID id) {
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        StorageLocation location = find(all, id);
        if (location.getParentId() != null && !find(all, location.getParentId()).isActive()) {
            throw new InvalidInputException("parentId", "Zuerst " + find(all, location.getParentId()).getName() + " wieder verwenden");
        }
        checkNameFree(all, location.getParentId(), location.getName(), id);
        Set<UUID> inside = subtree(all, id);
        all.stream().filter(l -> inside.contains(l.getId())).forEach(StorageLocation::activate);
        return saved(location);
    }

    /** Order within one level: all IDs must have the same parent (first ID = top). */
    public List<StorageLocationDto> reorder(List<UUID> ids) {
        List<StorageLocation> all = repository.findAllByOrderBySortOrderAscNameAsc();
        UUID parentId = find(all, ids.getFirst()).getParentId();
        List<StorageLocation> siblings = all.stream().filter(l -> Objects.equals(l.getParentId(), parentId)).toList();
        if (!siblings.stream().map(StorageLocation::getId).toList().containsAll(ids)) {
            throw new InvalidInputException("ids", "Nur Lagerorte derselben Ebene");
        }
        SortOrder.reorder(siblings, ids, "Lagerort");
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return list(true);
    }

    /** The place and everything inside it, as deep as it goes */
    private static Set<UUID> subtree(List<StorageLocation> all, UUID id) {
        Set<UUID> found = new HashSet<>(List.of(id));
        List<UUID> open = new ArrayList<>(List.of(id));
        while (!open.isEmpty()) {
            UUID current = open.removeLast();
            for (StorageLocation l : all) {
                if (current.equals(l.getParentId()) && found.add(l.getId())) {
                    open.add(l.getId());
                }
            }
        }
        return found;
    }

    /** The parent must exist; an active place only goes into an active one. */
    private static void checkParent(List<StorageLocation> all, UUID parentId, StorageLocation moved) {
        if (parentId == null) {
            return;
        }
        StorageLocation parent = all.stream().filter(l -> l.getId().equals(parentId)).findFirst()
                .orElseThrow(() -> new InvalidInputException("parentId", "Diesen Lagerort gibt es nicht"));
        if (!parent.isActive() && (moved == null || moved.isActive())) {
            throw new InvalidInputException("parentId", parent.getName() + " wird nicht mehr verwendet");
        }
    }

    private static void checkNameFree(List<StorageLocation> all, UUID parentId, String name, UUID self) {
        boolean taken = all.stream().anyMatch(l -> l.isActive() && !l.getId().equals(self)
                && Objects.equals(l.getParentId(), parentId) && l.getName().equalsIgnoreCase(name));
        if (taken) {
            throw new InvalidInputException("name", "'" + name + "' gibt es hier bereits");
        }
    }

    private static int nextSortOrder(List<StorageLocation> all, UUID parentId) {
        return all.stream().filter(l -> Objects.equals(l.getParentId(), parentId))
                .mapToInt(StorageLocation::getSortOrder).max().orElse(-1) + 1;
    }

    private static StorageLocation find(List<StorageLocation> all, UUID id) {
        return all.stream().filter(l -> l.getId().equals(id)).findFirst().orElseThrow(() -> new NotFoundException("Lagerort", id));
    }

    private StorageLocationDto saved(StorageLocation location) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return StorageLocationDto.of(location);
    }
}
