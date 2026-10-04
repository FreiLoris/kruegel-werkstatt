package ch.kruegel.workshop;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Starts the complete application (including database) and checks that it runs.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class WorkshopApplicationTests {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void healthEndpointReportsUp() {
        assertThat(mvc.get().uri("/api/health"))
                .hasStatus(HttpStatus.OK)
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
    }

    @Test
    void healthEndpointChecksDatabase() {
        assertThat(mvc.get().uri("/api/health"))
                .bodyJson()
                .extractingPath("$.components.db.status")
                .isEqualTo("UP");
    }

    @Test
    void flywayRanMigrations() {
        Integer successfulMigrations = jdbc
                .sql("SELECT COUNT(*) FROM flyway_schema_history WHERE success")
                .query(Integer.class)
                .single();

        assertThat(successfulMigrations).isGreaterThanOrEqualTo(1);
    }

    @Test
    void migrationRenamedAllConstraintsAndIndexesToEnglish() {
        // V6 translates constraint/index names with a loop – make sure nothing German is left
        Integer germanNames = jdbc
                .sql("""
                        SELECT COUNT(*) FROM (
                            SELECT conname AS name FROM pg_constraint WHERE connamespace = 'public'::regnamespace
                            UNION ALL
                            SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
                        ) n
                        WHERE name ~ '(mitarbeiter|serviceleistung|aktiv|reihenfolge|erstellt|geaendert|farbe|rolle)'
                        """)
                .query(Integer.class)
                .single();

        assertThat(germanNames).isZero();
    }
}
