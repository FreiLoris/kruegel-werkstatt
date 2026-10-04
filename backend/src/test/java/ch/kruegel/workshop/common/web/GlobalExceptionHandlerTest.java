package ch.kruegel.workshop.common.web;

import ch.kruegel.workshop.common.person.PersonDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Checks that every error is answered in the uniform Problem Details format.
 *
 * <p>{@code @WebMvcTest} only starts the web layer (controllers + ControllerAdvice),
 * without database – therefore very fast.
 */
@WebMvcTest(ErrorTestController.class)
class GlobalExceptionHandlerTest {

    // The person check belongs to the web layer and is therefore started too –
    // it needs the employee database, which this slim test does not have.
    @MockitoBean
    private PersonDirectory personDirectory;

    @Autowired
    private MockMvcTester mvc;

    @Test
    void invalidInputReturns400WithFieldErrors() {
        MvcTestResult response = mvc.post().uri("/test/errors/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "name": "", "code": "far too long" }
                        """)
                .exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Ungültige Eingabe");
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("code");
        assertThat(response).bodyJson().extractingPath("$.errors[1].field").isEqualTo("name");
        assertThat(response).bodyJson().extractingPath("$.errors[1].message").isEqualTo("darf nicht leer sein");
    }

    @Test
    void brokenJsonReturns400() {
        MvcTestResult response = mvc.post().uri("/test/errors/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ not json")
                .exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void notFoundReturns404() {
        MvcTestResult response = mvc.get().uri("/test/errors/not-found").exchange();

        assertThat(response).hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyJson().extractingPath("$.detail")
                .isEqualTo("Mitarbeiter mit ID 00000000-0000-0000-0000-000000000001 wurde nicht gefunden.");
    }

    @Test
    void unknownUrlReturns404InSameFormat() {
        MvcTestResult response = mvc.get().uri("/api/does-not-exist").exchange();

        assertThat(response).hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void staleVersionReturns409() {
        MvcTestResult response = mvc.get().uri("/test/errors/conflict").exchange();

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Inzwischen geändert");
    }

    @Test
    void unexpectedErrorReturns500WithoutTechnicalDetails() {
        MvcTestResult response = mvc.get().uri("/test/errors/crash").exchange();

        assertThat(response).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyText().doesNotContain("secret technical details");
    }
}
