package ch.kruegel.workshop.inspectionstation;

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

/** Inspection stations from the outside (FB-10). Besides the standard one: fictitious stations only. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class InspectionStationApiTest {

    private static final String STANDARD = "Strassenverkehrsamt Winterthur-Wülflingen";

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
    void winterthurWuelflingenIsThereAsTheStandard() {
        MvcTestResult list = mvc.get().uri("/api/inspection-stations").exchange();

        assertThat(list).bodyJson().extractingPath("$[0].name").isEqualTo(STANDARD);
        assertThat(list).bodyJson().extractingPath("$[0].standard").isEqualTo(true);
        assertThat(list).bodyJson().extractingPath("$[0].minutes").isEqualTo(60);
    }

    @Test
    void createsAndEditsAStation() {
        MvcTestResult created = send("POST", "/api/inspection-stations", """
                { "name": " Prüfstelle Muster ", "address": "Musterstrasse 1, 8000 Musterhausen", "phone": "", "minutes": 120 }""");

        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.name").isEqualTo("Prüfstelle Muster");
        assertThat(created).bodyJson().extractingPath("$.phone").isNull();
        assertThat(created).bodyJson().extractingPath("$.standard").isEqualTo(false);
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("inspection-stations");

        MvcTestResult edited = send("PUT", "/api/inspection-stations/" + idOf(created), """
                { "name": "Prüfstelle Muster", "minutes": 90, "version": 0 }""");
        assertThat(edited).bodyJson().extractingPath("$.minutes").isEqualTo(90);
        assertThat(edited).bodyJson().extractingPath("$.address").isNull();

        assertThat(send("POST", "/api/inspection-stations", "{ \"name\": \"prüfstelle muster\", \"minutes\": 60 }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        assertThat(send("POST", "/api/inspection-stations", "{ \"name\": \"Beispiel\", \"minutes\": 5 }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("minutes");
    }

    @Test
    void exactlyOneIsTheStandardAndItStaysInUse() {
        String standard = idOf(mvc.get().uri("/api/inspection-stations").exchange(), "$[0].id");
        String muster = idOf(send("POST", "/api/inspection-stations", "{ \"name\": \"Prüfstelle Muster\", \"minutes\": 60 }"));

        assertThat(send("POST", "/api/inspection-stations/" + standard + "/deactivate", null)).hasStatus(HttpStatus.CONFLICT);

        assertThat(send("POST", "/api/inspection-stations/" + muster + "/standard", null)).bodyJson().extractingPath("$.standard").isEqualTo(true);
        MvcTestResult list = mvc.get().uri("/api/inspection-stations").exchange();
        // the standard first, the old one is a station like any other now
        assertThat(list).bodyJson().extractingPath("$[*].standard").asArray().containsExactly(true, false);
        assertThat(list).bodyJson().extractingPath("$[0].name").isEqualTo("Prüfstelle Muster");

        // no longer used: stays in the list, cannot be the standard
        assertThat(send("POST", "/api/inspection-stations/" + standard + "/deactivate", null)).bodyJson().extractingPath("$.active").isEqualTo(false);
        assertThat(send("POST", "/api/inspection-stations/" + standard + "/standard", null)).hasStatus(HttpStatus.CONFLICT);
        assertThat(send("POST", "/api/inspection-stations/" + standard + "/activate", null)).bodyJson().extractingPath("$.active").isEqualTo(true);
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
        return idOf(response, "$.id");
    }

    private static String idOf(MvcTestResult response, String path) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), path);
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
