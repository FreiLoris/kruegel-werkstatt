package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.Employee;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Recurring absences (FB-33) from the outside. Changes are made as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AbsenceSeriesApiTest {

    /** Three months of external work every Mon, Tue and Thu – the case of the workshop */
    private static final String THREE_MONTHS = """
            "category": "EXTERNAL_WORK", "company": "Garage Muster", "from": "2026-11-02", "to": "2027-01-29",
            "weekdays": ["MONDAY", "TUESDAY", "THURSDAY"]""";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Employee doeme;

    @BeforeEach
    void startWithPeople() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        doeme = employees.save(EmployeeTestData.employee("Döme", 1));
    }

    @Test
    void thePreviewCountsTheDaysAndLeavesOutWhatIsInTheWayNothingSaved() {
        send("POST", "/api/absences", """
                { "employeeId": "%s", "category": "VACATION", "startDate": "2026-11-05", "endDate": "2026-11-05" }""".formatted(doeme.getId()));

        MvcTestResult preview = send("POST", "/api/absences/series/preview", series(THREE_MONTHS));

        assertThat(preview).hasStatusOk();
        // 13 weeks × 3 days = 39, one Thursday on vacation
        assertThat(preview).bodyJson().extractingPath("$.days.length()").isEqualTo(38);
        assertThat(preview).bodyJson().extractingPath("$.days[0]").isEqualTo("2026-11-02");
        assertThat(preview).bodyJson().extractingPath("$.days[37]").isEqualTo("2027-01-28");
        assertThat(preview).bodyJson().extractingPath("$.conflicts[0].day").isEqualTo("2026-11-05");
        assertThat(preview).bodyJson().extractingPath("$.conflicts[0].reason").isEqualTo("bereits als Ferien eingetragen");
        assertThat(absences()).hasSize(1);
    }

    @Test
    void entersEveryDayAsAnEntryOfItsOwnInOneSeries() {
        MvcTestResult created = send("POST", "/api/absences/series", series(THREE_MONTHS + ", \"startTime\": \"07:30\", \"note\": \"Aushilfe\""));

        assertThat(created).hasStatus(HttpStatus.CREATED);
        List<String> seriesIds = JsonPath.read(body(list()), "$[*].seriesId");
        assertThat(seriesIds).hasSize(39).containsOnly(seriesIds.getFirst()).doesNotContainNull();
        assertThat(list()).bodyJson().extractingPath("$[0].startDate").isEqualTo("2026-11-02");
        assertThat(list()).bodyJson().extractingPath("$[0].endDate").isEqualTo("2026-11-02");
        assertThat(list()).bodyJson().extractingPath("$[0].startTime").isEqualTo("07:30:00");
        assertThat(list()).bodyJson().extractingPath("$[0].company").isEqualTo("Garage Muster");
    }

    @Test
    void publicHolidaysAreLeftOutEveryOtherWeekToo() {
        MvcTestResult fridays = send("POST", "/api/absences/series/preview", series("""
                "category": "TRAINING", "from": "2026-12-21", "to": "2027-01-03", "weekdays": ["FRIDAY"]"""));
        assertThat(fridays).bodyJson().extractingPath("$.holidays").asArray().containsExactly("2026-12-25", "2027-01-01");
        assertThat(fridays).bodyJson().extractingPath("$.days").asArray().isEmpty();
        // nothing left – nothing to save
        assertThat(send("POST", "/api/absences/series", series("""
                "category": "TRAINING", "from": "2026-12-21", "to": "2027-01-03", "weekdays": ["FRIDAY"]""")))
                .hasStatus(HttpStatus.BAD_REQUEST);

        MvcTestResult everyOther = send("POST", "/api/absences/series/preview", series("""
                "category": "TRAINING", "from": "2026-11-02", "to": "2026-11-30", "weekdays": ["MONDAY"], "everyOtherWeek": true"""));
        assertThat(everyOther).bodyJson().extractingPath("$.days").asArray().containsExactly("2026-11-02", "2026-11-16", "2026-11-30");
    }

    @Test
    void deletedPerDayFromADayOnOrAsAWhole() {
        send("POST", "/api/absences/series", series(THREE_MONTHS));
        String firstMonday = JsonPath.read(body(list()), "$[0].id");
        String secondMonday = JsonPath.read(body(list()), "$[3].id");

        // one Monday in the workshop after all
        assertThat(send("DELETE", "/api/absences/" + firstMonday + "/series?scope=DAY", null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(absences()).hasSize(38);

        // back earlier: from the second Monday on nothing more
        send("DELETE", "/api/absences/" + secondMonday + "/series?scope=FROM_HERE", null);
        assertThat(list()).bodyJson().extractingPath("$[*].startDate").asArray().containsExactly("2026-11-03", "2026-11-05");

        send("DELETE", "/api/absences/" + JsonPath.read(body(list()), "$[0].id") + "/series?scope=ALL", null);
        assertThat(absences()).isEmpty();
    }

    @Test
    void changedFromADayOnEachKeepsItsDay() {
        send("POST", "/api/absences/series", series(THREE_MONTHS));
        String id = JsonPath.read(body(list()), "$[3].id");

        MvcTestResult changed = send("PUT", "/api/absences/" + id + "/series?scope=FROM_HERE", """
                { "employeeId": "%s", "category": "EXTERNAL_WORK", "company": "Garage Muster", "note": "nur vormittags",
                  "startDate": "2026-11-09", "endDate": "2026-11-09", "endTime": "12:00", "version": 0 }""".formatted(doeme.getId()));

        assertThat(changed).hasStatusOk();
        assertThat(changed).bodyJson().extractingPath("$.length()").isEqualTo(36);
        assertThat(list()).bodyJson().extractingPath("$[2].note").isNull();
        assertThat(list()).bodyJson().extractingPath("$[3].note").isEqualTo("nur vormittags");
        assertThat(list()).bodyJson().extractingPath("$[38].startDate").isEqualTo("2027-01-28");
        assertThat(list()).bodyJson().extractingPath("$[38].endTime").isEqualTo("12:00:00");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private String series(String fields) {
        return "{ \"employeeId\": \"%s\", %s }".formatted(doeme.getId(), fields);
    }

    private MvcTestResult list() {
        return mvc.get().uri("/api/absences?from=2026-10-01&to=2027-02-28").exchange();
    }

    private List<Object> absences() {
        return JsonPath.read(body(list()), "$");
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            case "DELETE" -> mvc.delete().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String body(MvcTestResult response) {
        try {
            return response.getResponse().getContentAsString();
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
