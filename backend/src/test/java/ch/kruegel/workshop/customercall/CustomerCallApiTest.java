package ch.kruegel.workshop.customercall;

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

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CustomerCallApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private JdbcTemplate jdbc;

    private String reto;
    private Customer huber;
    private Customer meier;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        reto = employees.save(EmployeeTestData.employee("Reto", 0)).getId().toString();
        huber = customers.save(CustomerTestData.local("Huber"));
        meier = customers.save(CustomerTestData.local("Meier"));
    }

    @Test
    void theLatestCallOfEachCustomerWithWhoCalled() {
        call(huber.getId().toString(), "{ \"outcome\": \"NOT_REACHED\" }");
        MvcTestResult latest = call(huber.getId().toString(), "{ \"outcome\": \"CALLBACK\", \"note\": \" ab 17 Uhr \" }");
        assertThat(latest).hasStatus(HttpStatus.CREATED);

        MvcTestResult list = mvc.get().uri("/api/customer-calls/latest").exchange();
        // Meier was never called – not in the list
        assertThat(list).bodyJson().extractingPath("$[*].customerId").asArray().containsExactly(huber.getId().toString());
        assertThat(list).bodyJson().extractingPath("$[0].outcome").isEqualTo("CALLBACK");
        assertThat(list).bodyJson().extractingPath("$[0].note").isEqualTo("ab 17 Uhr");
        assertThat(list).bodyJson().extractingPath("$[0].calledBy").isEqualTo(reto);
    }

    @Test
    void aCallTappedByMistakeIsDeleted() {
        String first = read(call(huber.getId().toString(), "{ \"outcome\": \"NOT_REACHED\" }"), "$.id");
        String mistake = read(call(huber.getId().toString(), "{ \"outcome\": \"REACHED\" }"), "$.id");

        assertThat(mvc.delete().uri("/api/customer-calls/" + mistake).header(CurrentPerson.HEADER, reto).exchange())
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(mvc.get().uri("/api/customer-calls/latest").exchange()).bodyJson()
                .extractingPath("$[*].id").asArray().containsExactly(first);
    }

    @Test
    void onlyOnesOwnCallCanBeDeleted() {
        String retosCall = read(call(huber.getId().toString(), "{ \"outcome\": \"REACHED\" }"), "$.id");
        String erich = employees.save(EmployeeTestData.employee("Erich", 1)).getId().toString();

        assertThat(mvc.delete().uri("/api/customer-calls/" + retosCall).header(CurrentPerson.HEADER, erich).exchange())
                .hasStatus(HttpStatus.CONFLICT);
        // noted long ago: kept too
        jdbc.update("UPDATE customer_call SET created_at = now() - interval '1 hour'");
        assertThat(mvc.delete().uri("/api/customer-calls/" + retosCall).header(CurrentPerson.HEADER, reto).exchange())
                .hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void oneCallPerCustomerAlsoAtTheSameMoment() {
        call(huber.getId().toString(), "{ \"outcome\": \"NOT_REACHED\" }");
        String later = read(call(huber.getId().toString(), "{ \"outcome\": \"REACHED\" }"), "$.id");
        jdbc.update("UPDATE customer_call SET created_at = '2026-10-28T10:00:00Z'");
        jdbc.update("UPDATE customer_call SET created_at = now()");

        assertThat(mvc.get().uri("/api/customer-calls/latest").exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(later);
    }

    @Test
    void anOutcomeIsNeededAndTheNoteIsShort() {
        assertThat(call(huber.getId().toString(), "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(call(huber.getId().toString(), "{ \"outcome\": \"REACHED\", \"note\": \"%s\" }".formatted("x".repeat(201))))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(call("01a1836f-0000-7000-8000-000000000000", "{ \"outcome\": \"REACHED\" }")).hasStatus(HttpStatus.NOT_FOUND);
    }

    private MvcTestResult call(String customerId, String json) {
        return mvc.post().uri("/api/customers/" + customerId + "/calls").header(CurrentPerson.HEADER, reto)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private static String read(MvcTestResult response, String path) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), path);
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
