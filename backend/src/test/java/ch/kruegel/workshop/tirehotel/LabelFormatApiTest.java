package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;

import static org.assertj.core.api.Assertions.assertThat;

/** Label sheet formats of the tyre hotel (FB-07). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LabelFormatApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void createsEditsAndDeletesAFormat() {
        MvcTestResult created = send("POST", "/api/label-formats", format("24 pro Bogen", 3, 8, "70", "37", "0.5", "0", "0", "0", null));
        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.heightMm").isEqualTo(37);
        String id = idOf(created);

        MvcTestResult edited = send("PUT", "/api/label-formats/" + id, format("24 pro Bogen", 3, 8, "70", "36.5", "4.5", "0", "0", "0", 0L));
        assertThat(edited).bodyJson().extractingPath("$.marginTop").isEqualTo(4.5);

        assertThat(mvc.get().uri("/api/label-formats").exchange()).bodyJson().extractingPath("$[*].name").asArray().containsExactly("24 pro Bogen");
        assertThat(send("DELETE", "/api/label-formats/" + id, null)).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void theLabelsMustFitOnA4AndTheNameIsUnique() {
        // one label per wheel – 1 × 2 would print only VL and VR
        assertFieldError(send("POST", "/api/label-formats", format("A5", 1, 2, "190", "140", "0", "0", "0", "0", null)), "rows");
        // 3 × 75 mm = 225 mm > 210 mm
        assertFieldError(send("POST", "/api/label-formats", format("Zu breit", 3, 8, "75", "37", "0", "0", "0", "0", null)), "widthMm");
        // 8 × 37 + 4.5 = 300.5 mm > 297 mm
        assertFieldError(send("POST", "/api/label-formats", format("Zu hoch", 3, 8, "70", "37", "4.5", "0", "0", "0", null)), "widthMm");
        send("POST", "/api/label-formats", format("Muster", 2, 2, "50", "50", "10", "10", "5", "5", null));
        assertFieldError(send("POST", "/api/label-formats", format("muster", 2, 2, "50", "50", "10", "10", "5", "5", null)), "name");
        assertFieldError(send("POST", "/api/label-formats", format("Klein", 2, 2, "5", "50", "10", "10", "5", "5", null)), "widthMm");
    }

    private static String format(String name, int columns, int rows, String width, String height, String top, String left, String gapX,
                                 String gapY, Long version) {
        return """
                { "name": "%s", "columns": %d, "rows": %d, "widthMm": %s, "heightMm": %s, "marginTop": %s, "marginLeft": %s,
                  "gapX": %s, "gapY": %s, "version": %s }""".formatted(name, columns, rows, width, height, top, left, gapX, gapY, version);
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
