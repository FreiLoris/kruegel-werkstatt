package ch.kruegel.werkstatt;

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
 * Startet die komplette Anwendung (inkl. Datenbank) und prüft, ob sie lauffähig ist.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class WerkstattApplicationTests {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void healthEndpointMeldetUp() {
        assertThat(mvc.get().uri("/api/health"))
                .hasStatus(HttpStatus.OK)
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
    }

    @Test
    void healthEndpointPrueftDatenbank() {
        assertThat(mvc.get().uri("/api/health"))
                .bodyJson()
                .extractingPath("$.components.db.status")
                .isEqualTo("UP");
    }

    @Test
    void flywayHatMigrationenAusgefuehrt() {
        Integer erfolgreicheMigrationen = jdbc
                .sql("SELECT COUNT(*) FROM flyway_schema_history WHERE success")
                .query(Integer.class)
                .single();

        assertThat(erfolgreicheMigrationen).isGreaterThanOrEqualTo(1);
    }
}
