package ch.kruegel.workshop.insurance;

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

/** Insurances from the outside (FB-06). Fictitious companies only. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class InsuranceApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

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
    void createsAndEditsAnInsurance() {
        MvcTestResult created = send("POST", "/api/insurances", """
                { "name": " Muster Versicherung ", "phone": "0800 000 000", "email": "" }""");

        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.name").isEqualTo("Muster Versicherung");
        assertThat(created).bodyJson().extractingPath("$.email").isNull();
        assertThat(created).bodyJson().extractingPath("$.active").isEqualTo(true);
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("insurances");

        MvcTestResult edited = send("PUT", "/api/insurances/" + idOf(created), """
                { "name": "Muster Versicherung", "phone": "0800 000 001", "email": "schaden@example.ch", "version": 0 }""");
        assertThat(edited).bodyJson().extractingPath("$.phone").isEqualTo("0800 000 001");
        assertThat(edited).bodyJson().extractingPath("$.version").isEqualTo(1);
    }

    @Test
    void refusesATakenNameAWrongEmailAndAnEditWithoutVersion() {
        String id = idOf(send("POST", "/api/insurances", "{ \"name\": \"Muster Versicherung\" }"));

        assertThat(send("POST", "/api/insurances", "{ \"name\": \"muster versicherung\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        assertThat(send("POST", "/api/insurances", "{ \"name\": \"Beispiel\", \"email\": \"kein-mail\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("email");
        assertThat(send("PUT", "/api/insurances/" + id, "{ \"name\": \"Neu\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("version");
    }

    @Test
    void aNameOfOnlyUnicodeSpacesIsAFieldErrorNotA500() {
        // U+2003 (em space): @NotBlank (Hibernate Validator 9: isBlank) and strip() in the service agree on "blank"
        MvcTestResult response = send("POST", "/api/insurances", "{ \"name\": \"\u2003\u2003\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void noLongerUsedOnesStayInTheListAndCanBeUsedAgain() {
        String muster = idOf(send("POST", "/api/insurances", "{ \"name\": \"Muster Versicherung\" }"));
        send("POST", "/api/insurances", "{ \"name\": \"Beispiel Assekuranz\" }");

        assertThat(send("POST", "/api/insurances/" + muster + "/deactivate", null)).bodyJson().extractingPath("$.active").isEqualTo(false);

        MvcTestResult list = mvc.get().uri("/api/insurances").exchange();
        // by name, the deactivated one too – old tasks still name it
        assertThat(list).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Beispiel Assekuranz", "Muster Versicherung");
        assertThat(send("POST", "/api/insurances/" + muster + "/activate", null)).bodyJson().extractingPath("$.active").isEqualTo(true);
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
