package ch.kruegel.workshop.customersearch;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDto;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDto;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Customer search for the order wizard: name, company, address, phone, plate, VIN …
 *
 * <p>The input is split into words; a customer matches if EVERY word occurs somewhere in their
 * data or in the data of one of their vehicles ("huber golf" finds Huber with his Golf).
 * Only active customers and vehicles. Vehicles without known holder are found too –
 * otherwise they could not be selected at all.
 */
@Service
@Transactional(readOnly = true)
public class CustomerSearchService {

    static final int MIN_LENGTH = 2;
    static final int MAX_LENGTH = 100;
    static final int MAX_LIMIT = 50;

    private final CustomerSearchRepository search;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;

    CustomerSearchService(CustomerSearchRepository search, CustomerRepository customers, VehicleRepository vehicles) {
        this.search = search;
        this.customers = customers;
        this.vehicles = vehicles;
    }

    public CustomerSearchResultDto search(String query, int limit) {
        List<String> words = words(query);
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new InvalidInputException("limit", "muss zwischen 1 und " + MAX_LIMIT + " liegen");
        }

        // one more than asked for: tells whether there are more hits
        List<UUID> customerIds = search.customers(words, limit + 1);
        List<UUID> vehicleIds = customerIds.size() > limit ? List.of() : search.vehiclesWithoutHolder(words, limit + 1);
        boolean more = customerIds.size() + vehicleIds.size() > limit;

        List<CustomerSearchHitDto> hits = new ArrayList<>(customerHits(customerIds.stream().limit(limit).toList(), words));
        // fill up the remaining places with vehicles without holder
        List<UUID> remaining = vehicleIds.stream().limit(limit - hits.size()).toList();
        inSearchOrder(vehicles.findAllById(remaining), Vehicle::getId, remaining)
                .forEach(v -> hits.add(new CustomerSearchHitDto(null, List.of(VehicleDto.of(v)))));
        return new CustomerSearchResultDto(hits, more);
    }

    private List<CustomerSearchHitDto> customerHits(List<UUID> ids, List<String> words) {
        if (ids.isEmpty()) {
            return List.of();
        }

        // all vehicles of all hits in one query instead of one per customer
        List<Vehicle> all = vehicles.findByCustomerIdInAndActiveTrueOrderByLicensePlateAsc(ids);
        Set<UUID> matching = new HashSet<>(search.matchingVehicles(all.stream().map(Vehicle::getId).toList(), words));
        Map<UUID, List<Vehicle>> byCustomer = all.stream()
                // stable sort: matching vehicles first, otherwise the plate order stays
                .sorted(Comparator.comparing(v -> !matching.contains(v.getId())))
                .collect(Collectors.groupingBy(v -> v.getCustomer().getId()));

        return inSearchOrder(customers.findAllById(ids), Customer::getId, ids).stream()
                .map(c -> new CustomerSearchHitDto(
                        CustomerDto.of(c),
                        byCustomer.getOrDefault(c.getId(), List.of()).stream().map(VehicleDto::of).toList()))
                .toList();
    }

    /** findAllById loads everything in one query but does not keep the order → sort back into the search order. */
    private static <T> List<T> inSearchOrder(List<T> loaded, Function<T, UUID> id, List<UUID> order) {
        Map<UUID, T> byId = loaded.stream().collect(Collectors.toMap(id, Function.identity()));
        return order.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    /** "  Huber  ZH 12 " → [huber, zh, 12]. Lower case like the search text in the view. */
    static List<String> words(String query) {
        String trimmed = query == null ? "" : query.strip();
        if (trimmed.length() < MIN_LENGTH) {
            throw new InvalidInputException("q", "mindestens " + MIN_LENGTH + " Zeichen eingeben");
        }
        if (trimmed.length() > MAX_LENGTH) {
            throw new InvalidInputException("q", "höchstens " + MAX_LENGTH + " Zeichen");
        }
        return Arrays.stream(trimmed.toLowerCase(Locale.ROOT).split("\\s+")).distinct().toList();
    }
}
