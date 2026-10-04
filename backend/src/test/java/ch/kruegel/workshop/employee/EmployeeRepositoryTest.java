package ch.kruegel.workshop.employee;

import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.config.JpaConfig;
import ch.kruegel.workshop.common.config.TimeConfig;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.util.List;

import static ch.kruegel.workshop.employee.EmployeeTestData.employee;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, TimeConfig.class})
class EmployeeRepositoryTest {

    @Autowired
    private EmployeeRepository repository;

    @Autowired
    private EntityManager em;

    @Test
    void savesAndLoadsAllDetails() {
        EmployeeDetails details = new EmployeeDetails("Reto", Role.MANAGEMENT, "#f6d860",
                LocalDate.of(1985, 3, 12), 25, false, true, false);
        Employee saved = repository.saveAndFlush(new Employee(details, 0));
        em.clear();

        Employee loaded = repository.findById(saved.getId()).orElseThrow();

        assertThat(loaded.getDetails()).isEqualTo(details);
        assertThat(loaded.isActive()).isTrue();
    }

    @Test
    void sortsBySortOrderThenByName() {
        repository.saveAll(List.of(
                employee("Noser", 2), employee("Erich", 1), employee("Döme", 1), employee("Reto", 0)));

        assertThat(repository.findAllByOrderBySortOrderAscNameAsc())
                .extracting(Employee::getName)
                .containsExactly("Reto", "Döme", "Erich", "Noser");
    }

    @Test
    void selectionContainsOnlyActiveOnes() {
        Employee former = employee("Former", 0);
        former.deactivate();
        repository.saveAll(List.of(former, employee("Active", 1)));

        assertThat(repository.findByActiveTrueOrderBySortOrderAscNameAsc())
                .extracting(Employee::getName)
                .containsExactly("Active");
    }

    @Test
    void twoActiveWithSameNameAreNotAllowed() {
        repository.saveAndFlush(employee("Reto", 0));

        // Case and surrounding whitespace do not matter
        assertThatThrownBy(() -> repository.saveAndFlush(employee(" reto ", 1)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void formerEmployeeDoesNotBlockTheName() {
        Employee former = employee("Reto", 0);
        former.deactivate();
        repository.saveAndFlush(former);

        repository.saveAndFlush(employee("Reto", 1));

        assertThat(repository.count()).isEqualTo(2);
    }

    @Test
    void nextSortOrderIsAtTheEnd() {
        assertThat(repository.nextSortOrder()).isZero();

        repository.saveAndFlush(employee("Reto", 0));
        repository.saveAndFlush(employee("Erich", 5));

        assertThat(repository.nextSortOrder()).isEqualTo(6);
    }

    @Test
    void databaseRejectsInvalidColorEvenWithoutJava() {
        // Second line of defence: even someone who writes to the database directly, bypassing
        // Java (e.g. a migration script), cannot store invalid values.
        assertThatThrownBy(() -> em.createNativeQuery("""
                        INSERT INTO employee (id, version, created_at, updated_at, name, role, color,
                            vacation_days_per_year, selectable_as_mechanic, selectable_for_todos, has_pinboard_column,
                            active, sort_order)
                        VALUES (gen_random_uuid(), 0, now(), now(), 'Test', 'MECHANIC', 'rot',
                            25, true, true, true, true, 0)
                        """).executeUpdate())
                .hasMessageContaining("color");
    }
}
