package ch.kruegel.workshop.company;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V63 on the two kinds of database (neutral 4): Krügel's, in use, must stay exactly as it is – a new one
 * starts neutral and with the setup assistant. Each case on a database of its own, migrated step by step.
 */
class V63MigrationTest {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @BeforeAll
    static void start() {
        POSTGRES.start();
    }

    @AfterAll
    static void stop() {
        POSTGRES.stop();
    }

    @Test
    void anInstallationInUse_staysAsItIs() {
        JdbcTemplate db = database("in_use");
        migrate("in_use", "62");
        db.update("""
                INSERT INTO employee (id, version, created_at, updated_at, name, role, color, vacation_days_per_year,
                    selectable_as_mechanic, selectable_for_todos, has_pinboard_column, active, sort_order)
                VALUES (uuidv7(), 0, now(), now(), 'Reto', 'MANAGEMENT', '#f6d860', 25, true, true, true, true, 0)""");
        migrate("in_use", "63");

        Map<String, Object> company = db.queryForMap("SELECT name, plate_canton, setup_completed_at FROM company_profile");
        assertThat(company.get("name")).isEqualTo("Krügel Fahrzeugtechnik");
        assertThat(company.get("plate_canton")).isEqualTo("ZH");
        assertThat(company.get("setup_completed_at")).isNotNull();
        assertThat(db.queryForList("SELECT name FROM inspection_station", String.class))
                .containsExactly("Strassenverkehrsamt Winterthur-Wülflingen");
    }

    @Test
    void aNewInstallation_startsNeutralWithTheAssistant() {
        JdbcTemplate db = database("fresh");
        migrate("fresh", "63");

        Map<String, Object> company = db.queryForMap("SELECT name, setup_completed_at FROM company_profile");
        assertThat(company.get("name")).isEqualTo("Meine Garage");
        assertThat(company.get("setup_completed_at")).isNull();
        assertThat(db.queryForList("SELECT name FROM inspection_station", String.class)).containsExactly("Strassenverkehrsamt");
    }

    /** An empty database of its own on the container */
    private static JdbcTemplate database(String name) {
        new JdbcTemplate(dataSource(POSTGRES.getDatabaseName())).execute("CREATE DATABASE " + name);
        return new JdbcTemplate(dataSource(name));
    }

    private static void migrate(String database, String target) {
        Flyway.configure().dataSource(dataSource(database)).locations("classpath:db/migration").target(target).load().migrate();
    }

    private static DriverManagerDataSource dataSource(String database) {
        String url = POSTGRES.getJdbcUrl().replace("/" + POSTGRES.getDatabaseName(), "/" + database);
        return new DriverManagerDataSource(url, POSTGRES.getUsername(), POSTGRES.getPassword());
    }
}
