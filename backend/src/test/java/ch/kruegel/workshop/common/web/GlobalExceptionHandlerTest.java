package ch.kruegel.workshop.common.web;

import ch.kruegel.workshop.common.person.PersonDirectory;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.sql.SQLException;

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
        // the client tells a version conflict apart from a business rule (also 409)
        assertThat(response).bodyJson().extractingPath("$.type").isEqualTo("urn:problem:version-conflict");
    }

    @Test
    void invalidInputExceptionReturns400AtTheField() {
        MvcTestResult response = mvc.get().uri("/test/errors/invalid-input").exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").isEqualTo("ist bereits vergeben");
    }

    @Test
    void businessRuleReturns409WithTheMessageAsIs() {
        MvcTestResult response = mvc.get().uri("/test/errors/business-rule").exchange();

        assertThat(response).hasStatus(HttpStatus.CONFLICT)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Nicht möglich");
        assertThat(response).bodyJson().extractingPath("$.detail")
                .isEqualTo("Die letzte Hebebühne kann nicht stillgelegt werden.");
    }

    @Test
    void databaseConstraintReturns409WithoutTechnicalDetails() {
        MvcTestResult response = mvc.get().uri("/test/errors/data-conflict").exchange();

        assertThat(response).hasStatus(HttpStatus.CONFLICT)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Nicht gespeichert");
        assertThat(response).bodyText().doesNotContain("duplicate key");
    }

    @Test
    void anotherDatabaseViolationIsAProgrammingError500() {
        MvcTestResult response = mvc.get().uri("/test/errors/data-error").exchange();

        assertThat(response).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response).bodyJson().extractingPath("$.title").isEqualTo("Unerwarteter Fehler");
        assertThat(response).bodyText().doesNotContain("Huber");
    }

    @Test
    void springsOwnErrorsAreInGerman() {
        MvcTestResult brokenJson = mvc.post().uri("/test/errors/validation").contentType(MediaType.APPLICATION_JSON).content("{ not json").exchange();
        MvcTestResult wrongMethod = mvc.delete().uri("/test/errors/crash").exchange();

        assertThat(brokenJson).bodyJson().extractingPath("$.title").isEqualTo("Ungültige Anfrage");
        assertThat(brokenJson).bodyJson().extractingPath("$.detail").isEqualTo("Die Daten sind unvollständig oder haben ein falsches Format.");
        assertThat(wrongMethod).hasStatus(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(wrongMethod).bodyJson().extractingPath("$.title").isEqualTo("Nicht erlaubt");
    }

    @Test
    void theLogNamesTheConstraintButNotTheRow() {
        // fictitious row – PostgreSQL puts the whole row into its message
        SQLException sql = new SQLException("new row violates check constraint. Failing row contains (Huber, 079 000 00 00)", "23514");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("could not execute statement",
                new ConstraintViolationException("could not execute statement", sql, "customer_name_check"));

        assertThat(GlobalExceptionHandler.constraintOf(ex))
                .isEqualTo("customer_name_check (SQLState 23514)")
                .doesNotContain("Huber");
    }

    @Test
    void unexpectedErrorReturns500WithoutTechnicalDetails() {
        MvcTestResult response = mvc.get().uri("/test/errors/crash").exchange();

        assertThat(response).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(response).bodyText().doesNotContain("secret technical details");
    }
}
