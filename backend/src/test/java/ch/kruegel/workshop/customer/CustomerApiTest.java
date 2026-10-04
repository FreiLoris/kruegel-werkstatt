package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;

import static org.assertj.core.api.Assertions.assertThat;

/** Customer API from the outside. Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class CustomerApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void createsLocalCustomer() {
        MvcTestResult response = send("POST", "/api/customers", """
                { "firstName": " Peter ", "lastName": "Huber", "phone": "052 000 00 00", "email": "" }
                """);

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.source").isEqualTo("LOCAL");
        assertThat(response).bodyJson().extractingPath("$.displayName").isEqualTo("Huber Peter");
        assertThat(response).bodyJson().extractingPath("$.email").isNull();
        assertThat(response).bodyJson().extractingPath("$.editable").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
    }

    @Test
    void companyWithoutPersonIsFine() {
        assertThat(send("POST", "/api/customers", "{ \"company\": \"Muster AG\" }")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void withoutLastNameAndCompanyIsFieldError() {
        MvcTestResult response = send("POST", "/api/customers", "{ \"firstName\": \"Peter\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("lastName");
    }

    @Test
    void invalidEmailIsFieldError() {
        MvcTestResult response = send("POST", "/api/customers", "{ \"lastName\": \"Huber\", \"email\": \"kein-mail\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("email");
    }

    @Test
    void editsLocalCustomerWithVersion() {
        String id = idOf(send("POST", "/api/customers", "{ \"lastName\": \"Huber\" }"));

        MvcTestResult response = send("PUT", "/api/customers/" + id, "{ \"lastName\": \"Huber\", \"mobile\": \"079 000 00 00\", \"version\": 0 }");

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.mobile").isEqualTo("079 000 00 00");
        assertThat(send("PUT", "/api/customers/" + id, "{ \"lastName\": \"Huber\", \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void swissGarageCustomerIsReadOnly() {
        Customer fromSwissGarage = customers.save(CustomerTestData.swissGarage("1001", "Huber"));
        String id = fromSwissGarage.getId().toString();

        assertThat(mvc.get().uri("/api/customers/" + id)).bodyJson().extractingPath("$.editable").isEqualTo(false);

        MvcTestResult response = send("PUT", "/api/customers/" + id, "{ \"lastName\": \"Anders\", \"version\": 0 }");
        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.detail").asString().contains("SwissGarage");
        assertThat(send("POST", "/api/customers/" + id + "/deactivate", null)).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void localCustomerCanBeDeactivated() {
        String id = idOf(send("POST", "/api/customers", "{ \"lastName\": \"Huber\" }"));

        MvcTestResult response = send("POST", "/api/customers/" + id + "/deactivate", null);

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.active").isEqualTo(false);
    }

    @Test
    void changesAreAnnouncedAsLiveUpdate() {
        send("POST", "/api/customers", "{ \"lastName\": \"Huber\" }");

        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("customers");
    }

    // ── Helpers ──────────────────────────────────────────────────────

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
