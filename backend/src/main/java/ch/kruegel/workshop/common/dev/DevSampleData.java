package ch.kruegel.workshop.common.dev;

import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeDetails;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Sample data for local development – ONLY in the Spring profile "dev"
 * (automatic with {@code ./mvnw spring-boot:run}, never in the Docker image, never in tests).
 *
 * <p>Java on purpose instead of a Flyway migration: the Flyway history should only contain the
 * real schema. Otherwise an installation without sample data (Docker, NAS) would refuse to start
 * as soon as it meets a database in which the sample data migration is recorded.
 * Also, the sample data goes through the same validation as real input.
 *
 * <p>Only creates data if the table is empty – your own changes are kept.
 */
@Component
@Profile("dev")
class DevSampleData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSampleData.class);

    private final EmployeeRepository employees;

    DevSampleData(EmployeeRepository employees) {
        this.employees = employees;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (employees.count() > 0) {
            return;
        }
        List<EmployeeDetails> team = List.of(
                person("Reto", Role.MANAGEMENT, "#f6d860", "1985-03-12", 25),
                person("Erich", Role.MECHANIC, "#ff9f9f", "1978-07-24", 25),
                person("Döme", Role.MECHANIC, "#9fdfaa", "1992-11-03", 20),
                person("Mora", Role.MECHANIC, "#9fc8f0", "1995-05-18", 20),
                person("Noser", Role.APPRENTICE, "#d4b0f0", "2004-09-30", 25));

        for (int i = 0; i < team.size(); i++) {
            employees.save(new Employee(team.get(i), i));
        }
        log.info("Dev sample data created: {} employees", team.size());
    }

    private static EmployeeDetails person(String name, Role role, String color, String birthday, int vacationDays) {
        return new EmployeeDetails(name, role, color, LocalDate.parse(birthday), vacationDays, true, true, true);
    }
}
