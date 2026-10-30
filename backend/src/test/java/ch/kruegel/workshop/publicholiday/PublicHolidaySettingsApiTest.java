package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import org.junit.jupiter.api.AfterEach;
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

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Choosing the workshop's public holidays (neutral 2) – the calendars follow right away. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicHolidaySettingsApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private PublicHolidays holidays;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @AfterEach
    void back() {
        // the other tests expect the canton of Zurich's days – the cache must not keep these ones
        TestDatabase.clear(jdbc);
        holidays.onChanged(new DataChanged(PublicHolidaySettingsService.TOPIC));
    }

    @Test
    void theCantonOfZurichsDaysUntilChanged() {
        MvcTestResult settings = mvc.get().uri("/api/public-holidays/settings").exchange();
        assertThat(settings).hasStatusOk().bodyJson().extractingPath("$.holidays.length()").isEqualTo(HolidayRule.values().length);
        assertThat(settings).bodyJson().extractingPath("$.holidays[?(@.chosen == true)].rule").asArray()
                .containsExactly("NEUJAHR", "BERCHTOLDSTAG", "KARFREITAG", "OSTERSONNTAG", "OSTERMONTAG", "TAG_DER_ARBEIT",
                        "AUFFAHRT", "PFINGSTSONNTAG", "PFINGSTMONTAG", "NATIONALFEIERTAG", "WEIHNACHTEN", "STEPHANSTAG");
        assertThat(settings).bodyJson().extractingPath("$.holidays[0].name").isEqualTo("Neujahr");
    }

    @Test
    void chosenOthers_theCalendarAndTheWorkingDaysFollow() {
        MvcTestResult saved = put("{ \"holidays\": [\"NEUJAHR\", \"FRONLEICHNAM\"], \"version\": 0 }");
        assertThat(saved).hasStatusOk().bodyJson().extractingPath("$.holidays[?(@.chosen == true)].rule").asArray()
                .containsExactly("NEUJAHR", "FRONLEICHNAM");

        assertThat(mvc.get().uri("/api/public-holidays?from=2026-01-01&to=2026-12-31").exchange())
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Neujahr", "Fronleichnam");
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 5, 14))).isTrue();   // Auffahrt no more
        assertThat(holidays.isWorkingDay(LocalDate.of(2026, 6, 4))).isFalse();   // Fronleichnam

        assertThat(put("{ \"holidays\": [], \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
        assertThat(put("{ \"holidays\": [\"OSTERN\"], \"version\": 1 }")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    private MvcTestResult put(String json) {
        return mvc.put().uri("/api/public-holidays/settings").header(CurrentPerson.HEADER, chef)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
