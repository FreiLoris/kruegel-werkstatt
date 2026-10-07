package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The year statistics (9c) from the outside. A past year (everything "taken") and 2099 (everything
 * "planned") keep the tests independent of today. Fictitious data only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AbsenceStatisticsApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private AbsenceRepository absences;

    @Autowired
    private JdbcTemplate jdbc;

    private Employee chef;
    private Employee reto;
    private Employee erich;

    @BeforeEach
    void startWithPeople() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0));
        reto = employees.save(EmployeeTestData.employee("Reto", 1));
        erich = employees.save(EmployeeTestData.employee("Erich", 2));
    }

    @Test
    void vacationCountsWorkingDaysOnlyAndIsSplitAtNewYear() {
        // Mon 22.12.2025 – Fri 2.1.2026: 25./26.12. and 1./2.1. are holidays, 27./28.12. a weekend
        save(reto, AbsenceCategory.VACATION, null, AbsencePeriod.days(day("2025-12-22"), day("2026-01-02")));
        // Mon afternoon – Wed noon = ½ + 1 + ½
        save(reto, AbsenceCategory.VACATION, null, new AbsencePeriod(day("2025-03-03"), true, day("2025-03-05"), true));

        MvcTestResult response = statistics(2025);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationTaken").asArray().containsExactly(8.0);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationPlanned").asArray().containsExactly(0.0);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationLeft").asArray().containsExactly(17.0);
        // nothing of it in 2026 – New Year's Day and Berchtoldstag
        assertThat(statistics(2026)).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationTaken").asArray().containsExactly(0.0);
    }

    @Test
    void vacationAfterTodayIsPlanned() {
        save(reto, AbsenceCategory.VACATION, null, AbsencePeriod.days(day("2099-07-06"), day("2099-07-10")));

        MvcTestResult response = statistics(2099);

        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationTaken").asArray().containsExactly(0.0);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationPlanned").asArray().containsExactly(5.0);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].vacationLeft").asArray().containsExactly(20.0);
    }

    @Test
    void sickAndTrainingInWorkingDaysToo() {
        // Fri 6.6.2025 – Mon 9.6.2025 = Friday only (weekend, Whit Monday)
        save(erich, AbsenceCategory.SICK, null, AbsencePeriod.days(day("2025-06-06"), day("2025-06-09")));
        save(erich, AbsenceCategory.TRAINING, null, new AbsencePeriod(day("2025-09-01"), false, day("2025-09-01"), true));

        MvcTestResult response = statistics(2025);

        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Erich')].sickDays").asArray().containsExactly(1.0);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Erich')].trainingDays").asArray().containsExactly(0.5);
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Erich')].vacationLeft").asArray().containsExactly(25.0);
    }

    @Test
    void externalWorkPerCompanyWithSpellingVariantsTogether() {
        save(erich, AbsenceCategory.EXTERNAL_WORK, "Garage Muster AG", AbsencePeriod.days(day("2025-02-03"), day("2025-02-04")));
        save(reto, AbsenceCategory.EXTERNAL_WORK, "garage muster ag", new AbsencePeriod(day("2025-02-10"), false, day("2025-02-10"), true));
        save(reto, AbsenceCategory.EXTERNAL_WORK, "Carrosserie Beispiel", AbsencePeriod.days(day("2025-02-11"), day("2025-02-13")));

        MvcTestResult response = statistics(2025);

        // most days first; the people in the usual order (Reto before Erich)
        assertThat(response).bodyJson().extractingPath("$.companies[*].company").asArray().containsExactly("Carrosserie Beispiel", "Garage Muster AG");
        assertThat(response).bodyJson().extractingPath("$.companies[1].days").isEqualTo(2.5);
        assertThat(response).bodyJson().extractingPath("$.companies[1].assignments").isEqualTo(2);
        assertThat(response).bodyJson().extractingPath("$.companies[1].employeeIds").asArray()
                .containsExactly(reto.getId().toString(), erich.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.people[?(@.name == 'Reto')].externalWorkDays").asArray().containsExactly(3.5);
    }

    @Test
    void formerPeopleOnlyWhenTheyWereAwayThatYear() {
        Employee away = employees.save(EmployeeTestData.employee("Alt", 3));
        employees.save(EmployeeTestData.employee("Weg", 4));
        save(away, AbsenceCategory.VACATION, null, AbsencePeriod.days(day("2025-04-07"), day("2025-04-07")));
        jdbc.update("UPDATE employee SET active = false WHERE name IN ('Alt', 'Weg')");

        MvcTestResult response = statistics(2025);

        assertThat(response).bodyJson().extractingPath("$.people[*].name").asArray().containsExactly("Chef", "Reto", "Erich", "Alt");
        assertThat(response).bodyJson().extractingPath("$.people[3].active").isEqualTo(false);
    }

    @Test
    void refusesImpossibleYears() {
        MvcTestResult response = statistics(1999);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[*].field").asArray().contains("year");
    }

    private void save(Employee who, AbsenceCategory category, String company, AbsencePeriod period) {
        absences.save(new Absence(who, category, company, null, period));
    }

    private MvcTestResult statistics(int year) {
        return mvc.get().uri("/api/absences/statistics").param("year", String.valueOf(year)).exchange();
    }

    private static LocalDate day(String isoDate) {
        return LocalDate.parse(isoDate);
    }
}
