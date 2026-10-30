package ch.kruegel.workshop.appmodule;

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

/** Switching parts of the app off (neutral 3). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ModuleSettingsApiTest {

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
    void allOnUntilSwitchedOff() {
        MvcTestResult modules = mvc.get().uri("/api/modules").exchange();
        assertThat(modules).hasStatusOk().bodyJson().extractingPath("$.modules.length()").isEqualTo(AppModule.values().length);
        assertThat(modules).bodyJson().extractingPath("$.modules[?(@.on == false)]").asArray().isEmpty();
        assertThat(modules).bodyJson().extractingPath("$.modules[1].title").isEqualTo("Pneuhotel");
    }

    @Test
    void switchedOff_andOnAgain() {
        MvcTestResult off = put("{ \"off\": [\"TIRE_HOTEL\", \"STATISTICS\"], \"version\": 0 }");
        assertThat(off).hasStatusOk().bodyJson().extractingPath("$.modules[?(@.on == false)].module").asArray()
                .containsExactly("TIRE_HOTEL", "STATISTICS");

        MvcTestResult on = put("{ \"off\": [], \"version\": 1 }");
        assertThat(on).hasStatusOk().bodyJson().extractingPath("$.modules[?(@.on == false)]").asArray().isEmpty();
    }

    @Test
    void anOldVersionOrAnUnknownModuleIsRefused() {
        assertThat(put("{ \"off\": [], \"version\": 7 }")).hasStatus(HttpStatus.CONFLICT);
        assertThat(put("{ \"off\": [\"KAFFEE\"], \"version\": 0 }")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private MvcTestResult put(String json) {
        return mvc.put().uri("/api/modules").header(CurrentPerson.HEADER, chef)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
