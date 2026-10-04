package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

/** Public holiday API from the outside. Read only – works without a selected person. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PublicHolidayApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Test
    void returnsHolidaysOfThePeriodAsIsoDates() {
        MvcTestResult response = mvc.get().uri("/api/public-holidays?from=2026-04-01&to=2026-04-30").exchange();

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$[*].date").asArray()
                .containsExactly("2026-04-03", "2026-04-05", "2026-04-06");
        assertThat(response).bodyJson().extractingPath("$[0].name").isEqualTo("Karfreitag");
    }

    @Test
    void endBeforeStartIsFieldError() {
        MvcTestResult response = mvc.get().uri("/api/public-holidays?from=2026-05-01&to=2026-04-01").exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("to");
    }

    @Test
    void periodIsLimitedToThreeYears() {
        assertThat(mvc.get().uri("/api/public-holidays?from=2026-01-01&to=2029-01-01"))
                .hasStatus(HttpStatus.OK);
        assertThat(mvc.get().uri("/api/public-holidays?from=2026-01-01&to=2029-01-02"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void invalidOrMissingDateIs400() {
        assertThat(mvc.get().uri("/api/public-holidays?from=gestern&to=2026-04-01")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(mvc.get().uri("/api/public-holidays?from=2026-04-01")).hasStatus(HttpStatus.BAD_REQUEST);
    }
}
