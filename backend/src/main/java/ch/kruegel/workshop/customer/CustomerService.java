package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Customers in the app. Only LOCAL customers can be created and changed here – SwissGarage
 * customers come from the import (ADR 0003).
 */
@Service
@Transactional
public class CustomerService {

    static final String TOPIC = "customers";

    private final CustomerRepository repository;
    private final ApplicationEventPublisher events;

    CustomerService(CustomerRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public CustomerDto get(UUID id) {
        return CustomerDto.of(find(id));
    }

    public CustomerDto create(CustomerRequest request) {
        return saved(repository.save(Customer.local(details(request))));
    }

    public CustomerDto update(UUID id, CustomerRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Customer customer = findLocal(id);
        customer.checkVersion(request.version());
        customer.update(details(request));
        return saved(customer);
    }

    public CustomerDto deactivate(UUID id) {
        Customer customer = findLocal(id);
        customer.deactivate();
        return saved(customer);
    }

    public CustomerDto activate(UUID id) {
        Customer customer = findLocal(id);
        customer.activate();
        return saved(customer);
    }

    /** A request without last name and company becomes a field error instead of a 500. */
    private static CustomerDetails details(CustomerRequest request) {
        if (!request.hasName()) {
            throw new InvalidInputException("lastName", "Nachname oder Firma muss ausgefüllt sein");
        }
        return request.toDetails();
    }

    private Customer find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Kunde", id));
    }

    /** SwissGarage customers are read-only in the app – the message tells the user where to change them. */
    private Customer findLocal(UUID id) {
        Customer customer = find(id);
        if (customer.isFromSwissGarage()) {
            throw new BusinessRuleException(
                    "Dieser Kunde stammt aus SwissGarage. Bitte dort ändern – die Änderung kommt mit dem nächsten Import.");
        }
        return customer;
    }

    private CustomerDto saved(Customer customer) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return CustomerDto.of(customer);
    }
}
