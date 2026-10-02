package ch.kruegel.werkstatt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Startet die komplette Anwendung und prüft, ob sie lauffähig ist.
 */
@SpringBootTest
@AutoConfigureMockMvc
class WerkstattApplicationTests {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void healthEndpointMeldetUp() {
        assertThat(mvc.get().uri("/api/health"))
                .hasStatus(HttpStatus.OK)
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
    }
}
