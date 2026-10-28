package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/** Suppliers: list, create, edit, delete. Names are unique (ignoring case). */
@Service
@Transactional
public class SupplierService {

    static final String TOPIC = "suppliers";
    /** A deleted supplier disappears from its articles. Same value as {@code StockItemService.TOPIC}. */
    private static final String STOCK_TOPIC = "stock-items";
    /** A deleted supplier also disappears from the shopping list (13g). Same value as {@code ShoppingService.TOPIC}. */
    private static final String SHOPPING_TOPIC = "shopping-items";

    private final SupplierRepository repository;
    private final ApplicationEventPublisher events;

    SupplierService(SupplierRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<SupplierDto> list() {
        return repository.findAllByName().stream().map(SupplierDto::of).toList();
    }

    public SupplierDto create(SupplierRequest request) {
        SupplierDetails details = details(request);
        if (repository.existsByNameIgnoreCase(details.name())) {
            throw nameTaken(details.name());
        }
        return saved(repository.save(new Supplier(details)));
    }

    public SupplierDto update(UUID id, SupplierRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Supplier supplier = find(id);
        supplier.checkVersion(request.version());
        SupplierDetails details = details(request);
        // check first, then change (Hibernate "auto flush", see ServiceItemService#rename)
        if (repository.existsByNameIgnoreCaseAndIdNot(details.name(), id)) {
            throw nameTaken(details.name());
        }
        supplier.update(details);
        return saved(supplier);
    }

    /** Its articles lose it (positions close up – a further supplier may become the main one). */
    public void delete(UUID id) {
        Supplier supplier = find(id);
        events.publishEvent(new SupplierDeleting(id));
        repository.delete(supplier);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        events.publishEvent(new DataChanged(STOCK_TOPIC));
        events.publishEvent(new DataChanged(SHOPPING_TOPIC));
    }

    private static SupplierDetails details(SupplierRequest request) {
        String webshop;
        try {
            // blank → not set (otherwise "  " would become "https://")
            webshop = SupplierDetails.withScheme(Texts.emptyToNull(request.webshopUrl()));
        } catch (IllegalArgumentException e) {
            throw new InvalidInputException("webshopUrl", "Nur Links mit http:// oder https://");
        }
        // @Size checks the input; "https://" added in front can make it too long
        if (webshop != null && webshop.length() > Supplier.URL_MAX) {
            throw new InvalidInputException("webshopUrl", "Höchstens " + Supplier.URL_MAX + " Zeichen (mit https://)");
        }
        List<SupplierContactDto> contactInput = request.contacts() == null ? List.of() : request.contacts();
        List<SupplierContact> contacts = new ArrayList<>();
        for (int i = 0; i < contactInput.size(); i++) {
            SupplierContactDto contact = contactInput.get(i);
            // the only rule @Size/@Email have not checked yet: a contact is not empty
            if (Stream.of(contact.department(), contact.name(), contact.phone(), contact.mobile(), contact.email())
                    .allMatch(value -> value == null || value.isBlank())) {
                throw new InvalidInputException("contacts[" + i + "]", "Abteilung, Name, Telefon oder E-Mail angeben");
            }
            contacts.add(contact.toContact());
        }
        List<SupplierDelivery> deliveries = request.deliveries() == null ? List.of()
                : request.deliveries().stream().map(SupplierDeliveryDto::toDelivery).toList();
        return new SupplierDetails(request.name(), request.phone(), request.email(), webshop, request.customerNumber(),
                request.orderChannel(), request.delivery(), request.remark(), contacts, deliveries);
    }

    private Supplier find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Lieferant", id));
    }

    private SupplierDto saved(Supplier supplier) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return SupplierDto.of(supplier);
    }

    private static InvalidInputException nameTaken(String name) {
        return new InvalidInputException("name", "'" + name.strip() + "' gibt es bereits");
    }
}
