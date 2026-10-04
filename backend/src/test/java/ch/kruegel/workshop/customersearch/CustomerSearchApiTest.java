package ch.kruegel.workshop.customersearch;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Customer search from the outside. Searching is a GET – no person needed. Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CustomerSearchApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private JdbcTemplate jdbc;

    private Customer huber;

    @BeforeEach
    void startWithHuberAndHisCars() {
        TestDatabase.clear(jdbc);
        huber = customers.save(CustomerTestData.swissGarage("1001", "Huber"));
        vehicles.save(Vehicle.local(huber, vehicle("ZH 123456", "VW", "Golf")));
        vehicles.save(Vehicle.local(huber, vehicle("ZH 1", "Audi", "A3")));
    }

    @Test
    void findsByLastNameWithAllActiveVehicles() {
        Vehicle old = vehicles.save(Vehicle.local(huber, vehicle("ZH 2", "Opel", "Kadett")));
        old.deactivate();
        vehicles.save(old);

        MvcTestResult response = search("hub");

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.hits[0].customer.lastName").isEqualTo("Huber");
        // by plate, the deactivated Kadett is missing
        assertThat(response).bodyJson().extractingPath("$.hits[0].vehicles[*].licensePlate").asArray()
                .containsExactly("ZH 1", "ZH 123456");
        assertThat(response).bodyJson().extractingPath("$.more").isEqualTo(false);
    }

    @Test
    void plateWithoutSpaceFindsHolderAndPutsMatchingVehicleFirst() {
        MvcTestResult response = search("zh123");

        assertThat(response).bodyJson().extractingPath("$.hits").asArray().hasSize(1);
        assertThat(response).bodyJson().extractingPath("$.hits[0].vehicles[0].licensePlate").isEqualTo("ZH 123456");
    }

    @Test
    void everyWordMustOccurSomewhere() {
        customers.save(CustomerTestData.local("Meier"));

        assertThat(search("huber golf")).bodyJson().extractingPath("$.hits").asArray().hasSize(1);
        assertThat(search("meier golf")).bodyJson().extractingPath("$.hits").asArray().isEmpty();
    }

    @Test
    void searchIgnoresCaseAlsoForUmlauts() {
        customers.save(Customer.local(new CustomerDetails(null, "Jürg", "Müller", null, null, null, null, "Zürich", null, null, null)));

        assertThat(search("MÜLLER zürich")).bodyJson().extractingPath("$.hits[0].customer.lastName").isEqualTo("Müller");
    }

    @Test
    void findsCompanyAndPhoneWithoutSpaces() {
        customers.save(Customer.local(new CustomerDetails(null, null, null, "Muster AG", null, null, null, null, "044 111 22 33", null, null)));

        assertThat(search("muster ag")).bodyJson().extractingPath("$.hits[0].customer.company").isEqualTo("Muster AG");
        assertThat(search("0441112233")).bodyJson().extractingPath("$.hits[0].customer.company").isEqualTo("Muster AG");
    }

    @Test
    void vehicleWithoutHolderIsAHitWithoutCustomer() {
        vehicles.save(Vehicle.local(null, vehicle("SG 777", "Fiat", "Panda")));

        MvcTestResult response = search("panda");

        assertThat(response).bodyJson().extractingPath("$.hits").asArray().hasSize(1);
        assertThat(response).bodyJson().extractingPath("$.hits[0].customer").isNull();
        assertThat(response).bodyJson().extractingPath("$.hits[0].vehicles[0].licensePlate").isEqualTo("SG 777");
    }

    @Test
    void inactiveCustomersAreNotFound() {
        Customer gone = CustomerTestData.local("Weg");
        gone.deactivate();
        customers.save(gone);

        assertThat(search("weg")).bodyJson().extractingPath("$.hits").asArray().isEmpty();
    }

    @Test
    void sortsByNameAndReportsMoreHits() {
        IntStream.rangeClosed(1, 3).forEach(i -> customers.save(CustomerTestData.local("Berger" + i)));

        MvcTestResult response = mvc.get().uri("/api/customer-search?q=berger&limit=2").exchange();

        assertThat(response).bodyJson().extractingPath("$.hits[*].customer.lastName").asArray()
                .containsExactly("Berger1", "Berger2");
        assertThat(response).bodyJson().extractingPath("$.more").isEqualTo(true);
    }

    @Test
    void percentAndUnderscoreAreNormalCharacters() {
        assertThat(search("%%")).bodyJson().extractingPath("$.hits").asArray().isEmpty();
        assertThat(search("h_ber")).bodyJson().extractingPath("$.hits").asArray().isEmpty();
    }

    @Test
    void tooShortQueryIsFieldError() {
        assertThat(search(" h ")).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("q");
    }

    @Test
    void limitOutOfRangeIsFieldError() {
        assertThat(mvc.get().uri("/api/customer-search?q=huber&limit=500").exchange())
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("limit");
    }

    private MvcTestResult search(String q) {
        return mvc.get().uri("/api/customer-search").param("q", q).exchange();
    }

    private static VehicleDetails vehicle(String plate, String make, String model) {
        return new VehicleDetails(plate, make, model, null, null, null, null, null, null, null);
    }
}
