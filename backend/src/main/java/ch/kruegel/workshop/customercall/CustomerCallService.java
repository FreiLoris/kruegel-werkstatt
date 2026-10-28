package ch.kruegel.workshop.customercall;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
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
    /** How far back a call is still worth knowing – a season and some */
    static final Duration REMEMBERED = Duration.ofDays(180);
    /** A call tapped by mistake can be deleted this long – by the one who noted it */
    static final Duration DELETABLE = Duration.ofMinutes(30);

    private final CustomerCallRepository repository;
    private final CustomerRepository customers;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    CustomerCallService(CustomerCallRepository repository, CustomerRepository customers, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.customers = customers;
        this.events = events;
        this.clock = clock;
    }

    /**
     * The latest call of every customer called in the last {@link #REMEMBERED} – a few hundred at
     * most; the lists take theirs (no list of ids in the address, which would grow too long).
     */
    @Transactional(readOnly = true)
    public List<CustomerCallDto> latest() {
        return repository.latestSince(clock.instant().minus(REMEMBERED)).stream().map(CustomerCallDto::of).toList();
    }

    public CustomerCallDto note(UUID customerId, CustomerCallRequest request) {
        Customer customer = customers.findById(customerId).orElseThrow(() -> new NotFoundException("Kunde", customerId));
        CustomerCall call = repository.saveAndFlush(new CustomerCall(customer, request.outcome(), request.note()));
        events.publishEvent(new DataChanged(TOPIC));
        return CustomerCallDto.of(call);
    }

    /** Tapped by mistake – only one's own, just noted: the history of the others' calls stays */
    public void delete(UUID id) {
        CustomerCall call = repository.findById(id).orElseThrow(() -> new NotFoundException("Anruf", id));
        boolean own = CurrentPerson.id().map(person -> person.equals(call.getCreatedBy())).orElse(false);
        if (!own || call.getCreatedAt().isBefore(clock.instant().minus(DELETABLE))) {
            // User-facing message, hence German
            throw new BusinessRuleException("Nur ein eben vermerkter eigener Anruf kann gelöscht werden.");
        }
        repository.delete(call);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }
}
