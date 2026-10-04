package ch.kruegel.workshop.vehicle;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;

import static org.assertj.core.api.Assertions.assertThat;

/** Vehicle API from the outside. Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class VehicleApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Customer huber;

    @BeforeEach
    void startWithChefAndCustomer() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        huber = customers.save(CustomerTestData.local("Huber"));
    }

    @Test
    void createsLocalVehicleForACustomer() {
        MvcTestResult response = send("POST", "/api/vehicles", """
                { "customerId": "%s", "licensePlate": " zh 12345 ", "make": "VW", "model": "Golf",
                  "modelYear": 2019, "mileageKm": 85000, "lastMfk": "2025-05-20" }
                """.formatted(huber.getId()));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.licensePlate").isEqualTo("ZH 12345");
        assertThat(response).bodyJson().extractingPath("$.description").isEqualTo("VW Golf");
        assertThat(response).bodyJson().extractingPath("$.customerId").isEqualTo(huber.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.editable").isEqualTo(true);
    }

    @Test
    void samePlateTwiceIsAllowed() {
        // The plate belongs to the holder and moves to the next car – old and new car both exist
        create("{ \"licensePlate\": \"ZH 12345\", \"make\": \"VW\" }");

        assertThat(create("{ \"licensePlate\": \"ZH 12345\", \"make\": \"Skoda\" }")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void withoutMakeAndModelIsFieldError() {
        MvcTestResult response = create("{ \"licensePlate\": \"ZH 12345\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("make");
    }

    @Test
    void unknownCustomerIsFieldError() {
        MvcTestResult response = create("{ \"customerId\": \"0199ffff-0000-7000-8000-000000000000\", \"make\": \"VW\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("customerId");
    }

    @Test
    void listsTheVehiclesOfACustomer() {
        create("{ \"customerId\": \"%s\", \"licensePlate\": \"ZH 2\", \"make\": \"VW\" }".formatted(huber.getId()));
        create("{ \"customerId\": \"%s\", \"licensePlate\": \"ZH 1\", \"make\": \"Audi\" }".formatted(huber.getId()));
        create("{ \"licensePlate\": \"ZH 3\", \"make\": \"Seat\" }");

        assertThat(mvc.get().uri("/api/vehicles?customerId=" + huber.getId()))
                .bodyJson().extractingPath("$[*].licensePlate").asArray().containsExactly("ZH 1", "ZH 2");
    }

    @Test
    void swissGarageVehicleIsReadOnly() {
        Customer holder = customers.save(CustomerTestData.swissGarage("1001", "Meier"));
        Vehicle fromSwissGarage = vehicles.save(Vehicle.fromSwissGarage("5001", holder,
                new VehicleDetails("ZH 9", "VW", "Polo", null, null, null, null, null, null, null)));

        MvcTestResult response = send("PUT", "/api/vehicles/" + fromSwissGarage.getId(), "{ \"make\": \"VW\", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.get().uri("/api/vehicles/" + fromSwissGarage.getId()))
                .bodyJson().extractingPath("$.swissgarageNumber").isEqualTo("5001");
    }

    @Test
    void editChangesHolder() {
        String id = idOf(create("{ \"make\": \"VW\" }"));

        MvcTestResult response = send("PUT", "/api/vehicles/" + id,
                "{ \"customerId\": \"%s\", \"make\": \"VW\", \"version\": 0 }".formatted(huber.getId()));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.customerId").isEqualTo(huber.getId().toString());
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String json) {
        return send("POST", "/api/vehicles", json);
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
