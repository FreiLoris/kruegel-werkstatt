package ch.kruegel.workshop.screenlock;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
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

import static org.assertj.core.api.Assertions.assertThat;

/** The screen lock setting (FB-29) from the outside. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ScreenLockApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void fiveMinutesUntilChanged() {
        assertThat(mvc.get().uri("/api/screen-lock-settings").exchange()).bodyJson().extractingPath("$.lockMinutes").isEqualTo(5);

        MvcTestResult changed = put("{ \"lockMinutes\": 10, \"version\": 0 }");

        assertThat(changed).hasStatusOk();
        assertThat(changed).bodyJson().extractingPath("$.lockMinutes").isEqualTo(10);
        // changed on another device meanwhile
        assertThat(put("{ \"lockMinutes\": 15, \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void neverOrAtMostTwoHours() {
        assertThat(put("{ \"lockMinutes\": 0, \"version\": 0 }")).bodyJson().extractingPath("$.lockMinutes").isEqualTo(0);
        assertThat(put("{ \"lockMinutes\": 121, \"version\": 1 }")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private MvcTestResult put(String json) {
        return mvc.put().uri("/api/screen-lock-settings").header(CurrentPerson.HEADER, chef)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
