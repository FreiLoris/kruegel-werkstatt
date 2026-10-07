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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Absence API from the outside. Changes are made as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AbsenceApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Employee reto;
    private Employee erich;

    @BeforeEach
    void startWithPeople() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        reto = employees.save(EmployeeTestData.employee("Reto", 1));
        erich = employees.save(EmployeeTestData.employee("Erich", 2));
    }

    @Test
    void entersAVacationWithHalfDays() {
        MvcTestResult response = create(reto, "VACATION", null, "2026-10-12", true, "2026-10-16", true);

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.category").isEqualTo("VACATION");
        assertThat(response).bodyJson().extractingPath("$.startsAfternoon").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.endsNoon").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.company").isNull();
    }

    @Test
    void externalWorkNamesTheCompanyTheOthersDoNot() {
        assertFieldError(create(reto, "EXTERNAL_WORK", null, "2026-10-12", false, "2026-10-12", false), "company");
        assertThat(create(reto, "EXTERNAL_WORK", " Garage Muster ", "2026-10-12", false, "2026-10-12", false))
                .bodyJson().extractingPath("$.company").isEqualTo("Garage Muster");
        // a company typed for sick leave is not kept
        assertThat(create(erich, "SICK", "Garage Muster", "2026-10-12", false, "2026-10-12", false))
                .bodyJson().extractingPath("$.company").isNull();
    }

    @Test
    void impossiblePeriodsAreFieldErrors() {
        assertFieldError(create(reto, "SICK", null, "2026-10-12", false, "2026-10-11", false), "endDate");
        assertFieldError(create(reto, "SICK", null, "2026-10-12", true, "2026-10-12", true), "endsNoon");
        assertFieldError(send("POST", "/api/absences", "{ \"employeeId\": \"%s\", \"startDate\": \"2026-10-12\", \"endDate\": \"2026-10-12\" }"
                .formatted(reto.getId())), "category");
    }

    @Test
    void onePersonNothingTwiceAtTheSameTime() {
        create(reto, "VACATION", null, "2026-10-12", false, "2026-10-16", false);

        MvcTestResult overlapping = create(reto, "SICK", null, "2026-10-15", false, "2026-10-15", false);
        assertFieldError(overlapping, "startDate");
        assertThat(overlapping).bodyJson().extractingPath("$.errors[0].message")
                .isEqualTo("Reto ist vom 12.10.2026 bis 16.10.2026 bereits als Ferien eingetragen");
        // the next day, another person, and morning/afternoon of one day are fine
        assertThat(create(reto, "SICK", null, "2026-10-17", false, "2026-10-17", false)).hasStatus(HttpStatus.CREATED);
        assertThat(create(erich, "SICK", null, "2026-10-15", false, "2026-10-15", false)).hasStatus(HttpStatus.CREATED);
        assertThat(create(reto, "TRAINING", null, "2026-10-19", false, "2026-10-19", true)).hasStatus(HttpStatus.CREATED);
        assertThat(create(reto, "SICK", null, "2026-10-19", true, "2026-10-19", false)).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void theDatabaseRefusesAnOverlapThatSlipsThrough() {
        create(reto, "VACATION", null, "2026-10-12", false, "2026-10-16", false);

        // as if a second device had not seen the first absence yet
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO absence (id, version, created_at, updated_at, employee_id, category, start_date, starts_afternoon, end_date, ends_noon)
                VALUES (gen_random_uuid(), 0, now(), now(), ?, 'SICK', '2026-10-16', true, '2026-10-16', false)""", reto.getId()))
                .hasMessageContaining("absence_no_overlap");
    }

    @Test
    void listsAPeriodAndChangesWithVersion() {
        String id = idOf(create(reto, "VACATION", null, "2026-10-12", false, "2026-10-16", false));
        create(erich, "SICK", null, "2026-11-02", false, "2026-11-02", false);

        assertThat(mvc.get().uri("/api/absences?from=2026-10-14&to=2026-10-20").exchange())
                .bodyJson().extractingPath("$[*].employeeId").asArray().containsExactly(reto.getId().toString());
        assertThat(mvc.get().uri("/api/absences?from=2026-10-01&to=2026-11-30&employeeId=" + erich.getId()).exchange())
                .bodyJson().extractingPath("$").asArray().hasSize(1);
        assertFieldError(mvc.get().uri("/api/absences?from=2026-01-01&to=2027-02-05").exchange(), "to");

        // moving within its own time does not collide with itself
        assertThat(send("PUT", "/api/absences/" + id, body(reto, "VACATION", null, "2026-10-13", false, "2026-10-17", false, 0)))
                .hasStatusOk();
        assertThat(send("PUT", "/api/absences/" + id, body(reto, "VACATION", null, "2026-10-13", false, "2026-10-18", false, 0)))
                .hasStatus(HttpStatus.CONFLICT);
        assertThat(mvc.delete().uri("/api/absences/" + id).header(CurrentPerson.HEADER, chef).exchange()).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void onlyActivePeopleButAPersonWhoLeftKeepsTheirAbsences() {
        String id = idOf(create(reto, "VACATION", null, "2026-10-12", false, "2026-10-16", false));
        reto.deactivate();
        employees.save(reto);

        assertFieldError(create(reto, "SICK", null, "2026-11-02", false, "2026-11-02", false), "employeeId");
        assertThat(send("PUT", "/api/absences/" + id, body(reto, "VACATION", null, "2026-10-12", false, "2026-10-15", false, 0)))
                .hasStatusOk();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(Employee who, String category, String company, String from, boolean afternoon, String to, boolean noon) {
        return send("POST", "/api/absences", body(who, category, company, from, afternoon, to, noon, null));
    }

    private static String body(Employee who, String category, String company, String from, boolean afternoon, String to, boolean noon,
                               Integer version) {
        return """
                { "employeeId": "%s", "category": "%s", "company": %s, "startDate": "%s", "startsAfternoon": %s,
                  "endDate": "%s", "endsNoon": %s, "version": %s }"""
                .formatted(who.getId(), category, company == null ? "null" : "\"" + company + "\"", from, afternoon, to, noon,
                        version == null ? "null" : version);
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        return request.header(CurrentPerson.HEADER, chef).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private static void assertFieldError(MvcTestResult response, String field) {
        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[*].field").asArray().contains(field);
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
