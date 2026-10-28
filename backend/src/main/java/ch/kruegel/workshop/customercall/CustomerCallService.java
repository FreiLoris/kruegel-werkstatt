package ch.kruegel.workshop.customercall;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Calls to customers (FB-16, FB-21): noted with one tap next to the phone number – the lists show the
 * latest, so nobody calls twice. Live on every device.
 */
@Service
@Transactional
public class CustomerCallService {

    static final String TOPIC = "customer-calls";
    /** The most customers asked for at once – a list of a few hundred */
    static final int MAX_CUSTOMERS = 500;

    private final CustomerCallRepository repository;
    private final CustomerRepository customers;
    private final ApplicationEventPublisher events;

    CustomerCallService(CustomerCallRepository repository, CustomerRepository customers, ApplicationEventPublisher events) {
        this.repository = repository;
        this.customers = customers;
        this.events = events;
    }

    /** The latest call of each customer – those never called are left out */
    @Transactional(readOnly = true)
    public List<CustomerCallDto> latest(List<UUID> customerIds) {
        if (customerIds.isEmpty()) {
            return List.of();
        }
        return repository.latestOf(customerIds.stream().distinct().limit(MAX_CUSTOMERS).toList()).stream().map(CustomerCallDto::of).toList();
    }

    public CustomerCallDto call(UUID customerId, CustomerCallRequest request) {
        Customer customer = customers.findById(customerId).orElseThrow(() -> new NotFoundException("Kunde", customerId));
        CustomerCall call = repository.saveAndFlush(new CustomerCall(customer, request.outcome(), request.note()));
        events.publishEvent(new DataChanged(TOPIC));
        return CustomerCallDto.of(call);
    }

    /** Tapped by mistake */
    public void delete(UUID id) {
        CustomerCall call = repository.findById(id).orElseThrow(() -> new NotFoundException("Anruf", id));
        repository.delete(call);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }
}
