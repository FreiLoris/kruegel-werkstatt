package ch.kruegel.workshop.common.dev;

import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarDetails;
import ch.kruegel.workshop.courtesycar.CourtesyCarRepository;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeDetails;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.Role;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/**
 * Sample data for local development – ONLY in the Spring profile "dev"
 * (automatic with {@code ./mvnw spring-boot:run}, never in the Docker image, never in tests).
 *
 * <p>Java on purpose instead of a Flyway migration: the Flyway history should only contain the
 * real schema. Otherwise an installation without sample data (Docker, NAS) would refuse to start
 * as soon as it meets a database in which the sample data migration is recorded.
 * Also, the sample data goes through the same validation as real input.
 *
 * <p>Each table is only filled if it is empty – your own changes are kept, and a table added
 * later still gets sample data in an existing development database.
 */
@Component
@Profile("dev")
class DevSampleData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSampleData.class);

    private final EmployeeRepository employees;
    private final CourtesyCarRepository courtesyCars;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final Clock clock;

    DevSampleData(EmployeeRepository employees, CourtesyCarRepository courtesyCars, CustomerRepository customers,
                  VehicleRepository vehicles, Clock clock) {
        this.employees = employees;
        this.courtesyCars = courtesyCars;
        this.customers = customers;
        this.vehicles = vehicles;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (employees.count() == 0) {
            createEmployees();
        }
        if (courtesyCars.count() == 0) {
            createCourtesyCars();
        }
        if (customers.count() == 0) {
            createCustomersAndVehicles();
        }
    }

    private void createEmployees() {
        List<EmployeeDetails> team = List.of(
                person("Reto", Role.MANAGEMENT, "#f6d860", "1985-03-12", 25),
                person("Erich", Role.MECHANIC, "#ff9f9f", "1978-07-24", 25),
                person("Döme", Role.MECHANIC, "#9fdfaa", "1992-11-03", 20),
                person("Mora", Role.MECHANIC, "#9fc8f0", "1995-05-18", 20),
                person("Noser", Role.APPRENTICE, "#d4b0f0", "2004-09-30", 25));

        for (int i = 0; i < team.size(); i++) {
            employees.save(new Employee(team.get(i), i));
        }
        log.info("Dev sample data created: {} employees", team.size());
    }

    /** Dates relative to today, so the warnings ("service overdue", "due soon") can always be seen. */
    private void createCourtesyCars() {
        LocalDate today = LocalDate.now(clock);
        List<CourtesyCarDetails> cars = List.of(
                new CourtesyCarDetails("Ersatzwagen 1", "VW Polo", "ZH 10001", today.plusMonths(5), today.plusYears(1)),
                new CourtesyCarDetails("Ersatzwagen 2", "Skoda Fabia", "ZH 10002", today.minusDays(3), today.plusDays(20)));

        for (int i = 0; i < cars.size(); i++) {
            courtesyCars.save(new CourtesyCar(cars.get(i), i));
        }
        log.info("Dev sample data created: {} courtesy cars", cars.size());
    }

    private static EmployeeDetails person(String name, Role role, String color, String birthday, int vacationDays) {
        return new EmployeeDetails(name, role, color, LocalDate.parse(birthday), vacationDays, true, true, true);
    }

    /**
     * Fictitious customers (no real people): two as if imported from SwissGarage, one walk-in.
     * The real ones come with the SwissGarage import (5c).
     */
    private void createCustomersAndVehicles() {
        LocalDate today = LocalDate.now(clock);
        Customer huber = customers.save(Customer.fromSwissGarage("90001", new CustomerDetails(
                "Herr", "Peter", "Huber", null, null, "Musterstrasse 12", "8400", "Winterthur",
                "052 000 00 01", "079 000 00 01", null)));
        Customer musterAg = customers.save(Customer.fromSwissGarage("90002", new CustomerDetails(
                null, null, null, "Muster Transport AG", "z. Hd. Frau Keller", "Industriestrasse 5", "8404", "Winterthur",
                "052 000 00 02", null, null)));
        Customer walkIn = customers.save(Customer.local(new CustomerDetails(
                "Frau", "Anna", "Beispiel", null, null, null, null, "Seuzach", null, "078 000 00 03", null)));

        vehicles.save(Vehicle.fromSwissGarage("70001", huber, new VehicleDetails(
                "ZH 900001", "VW", "Golf", null, LocalDate.of(2019, 3, 15), 2019, 86_000, today.minusYears(2), "Grau", "Benzin")));
        vehicles.save(Vehicle.fromSwissGarage("70002", musterAg, new VehicleDetails(
                "ZH 900002", "Mercedes-Benz", "Sprinter", null, LocalDate.of(2017, 6, 1), 2017, 154_000, today.minusYears(1), "Weiss", "Diesel")));
        vehicles.save(Vehicle.fromSwissGarage("70003", musterAg, new VehicleDetails(
                "ZH 900003", "Skoda", "Octavia Combi", null, LocalDate.of(2021, 9, 20), 2021, 61_000, null, "Blau", "Diesel")));
        vehicles.save(Vehicle.local(walkIn, new VehicleDetails(
                "ZH 900004", "Toyota", "Yaris", null, null, 2015, null, null, "Rot", "Hybrid")));
        log.info("Dev sample data created: 3 customers, 4 vehicles");
    }
}
