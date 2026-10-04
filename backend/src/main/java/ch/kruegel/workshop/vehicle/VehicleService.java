package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Vehicles in the app. Only LOCAL vehicles can be created and changed here – SwissGarage
 * vehicles come from the import (ADR 0003).
 */
@Service
@Transactional
public class VehicleService {

    static final String TOPIC = "vehicles";

    private final VehicleRepository repository;
    private final CustomerRepository customers;
    private final ApplicationEventPublisher events;

    VehicleService(VehicleRepository repository, CustomerRepository customers, ApplicationEventPublisher events) {
        this.repository = repository;
        this.customers = customers;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public VehicleDto get(UUID id) {
        return VehicleDto.of(find(id));
    }

    @Transactional(readOnly = true)
    public List<VehicleDto> ofCustomer(UUID customerId) {
        return repository.findByCustomerIdOrderByActiveDescLicensePlateAsc(customerId).stream().map(VehicleDto::of).toList();
    }

    public VehicleDto create(VehicleRequest request) {
        return saved(repository.save(Vehicle.local(holder(request), details(request))));
    }

    public VehicleDto update(UUID id, VehicleRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Vehicle vehicle = findLocal(id);
        vehicle.checkVersion(request.version());
        vehicle.update(holder(request), details(request));
        return saved(vehicle);
    }

    public VehicleDto deactivate(UUID id) {
        Vehicle vehicle = findLocal(id);
        vehicle.deactivate();
        return saved(vehicle);
    }

    public VehicleDto activate(UUID id) {
        Vehicle vehicle = findLocal(id);
        vehicle.activate();
        return saved(vehicle);
    }

    private Customer holder(VehicleRequest request) {
        if (request.customerId() == null) {
            return null;
        }
        return customers.findById(request.customerId())
                .orElseThrow(() -> new InvalidInputException("customerId", "Diesen Kunden gibt es nicht"));
    }

    private static VehicleDetails details(VehicleRequest request) {
        if (!request.hasMakeOrModel()) {
            throw new InvalidInputException("make", "Marke oder Modell muss ausgefüllt sein");
        }
        return request.toDetails();
    }

    private Vehicle find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Fahrzeug", id));
    }

    private Vehicle findLocal(UUID id) {
        Vehicle vehicle = find(id);
        if (vehicle.isFromSwissGarage()) {
            throw new BusinessRuleException(
                    "Dieses Fahrzeug stammt aus SwissGarage. Bitte dort ändern – die Änderung kommt mit dem nächsten Import.");
        }
        return vehicle;
    }

    private VehicleDto saved(Vehicle vehicle) {
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return VehicleDto.of(vehicle);
    }
}
