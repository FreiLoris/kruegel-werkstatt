package ch.kruegel.werkstatt.common.web;

import ch.kruegel.werkstatt.common.person.PersonVerzeichnis;
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
 * Prüft, dass alle Fehler im einheitlichen Problem-Details-Format beantwortet werden.
 *
 * <p>{@code @WebMvcTest} startet nur die Web-Schicht (Controller + ControllerAdvice),
 * ohne Datenbank – darum sehr schnell.
 */
@WebMvcTest(FehlerTestController.class)
class GlobalExceptionHandlerTest {

    // Die Personenprüfung gehört zur Web-Schicht und wird darum mitgestartet –
    // sie braucht die Mitarbeiter-Datenbank, die es in diesem schlanken Test nicht gibt.
    @MockitoBean
    private PersonVerzeichnis personVerzeichnis;


    @Autowired
    private MockMvcTester mvc;

    @Test
    void ungueltigeEingabeLiefert400MitFeldfehlern() {
        MvcTestResult antwort = mvc.post().uri("/test/fehler/validierung")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "name": "", "kuerzel": "viel zu lang" }
                        """)
                .exchange();

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(antwort).bodyJson().extractingPath("$.title").isEqualTo("Ungültige Eingabe");
        assertThat(antwort).bodyJson().extractingPath("$.fehler[0].feld").isEqualTo("kuerzel");
        assertThat(antwort).bodyJson().extractingPath("$.fehler[1].feld").isEqualTo("name");
        assertThat(antwort).bodyJson().extractingPath("$.fehler[1].meldung").isEqualTo("darf nicht leer sein");
    }

    @Test
    void kaputtesJsonLiefert400() {
        MvcTestResult antwort = mvc.post().uri("/test/fehler/validierung")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ kein json")
                .exchange();

        assertThat(antwort).hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void nichtGefundenLiefert404() {
        MvcTestResult antwort = mvc.get().uri("/test/fehler/nicht-gefunden").exchange();

        assertThat(antwort).hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(antwort).bodyJson().extractingPath("$.detail")
                .isEqualTo("Mitarbeiter mit ID 00000000-0000-0000-0000-000000000001 wurde nicht gefunden.");
    }

    @Test
    void unbekannteUrlLiefert404ImSelbenFormat() {
        MvcTestResult antwort = mvc.get().uri("/api/gibt-es-nicht").exchange();

        assertThat(antwort).hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void veralteteVersionLiefert409() {
        MvcTestResult antwort = mvc.get().uri("/test/fehler/konflikt").exchange();

        assertThat(antwort).hasStatus(HttpStatus.CONFLICT);
        assertThat(antwort).bodyJson().extractingPath("$.title").isEqualTo("Inzwischen geändert");
    }

    @Test
    void unerwarteterFehlerLiefert500OhneTechnischeDetails() {
        MvcTestResult antwort = mvc.get().uri("/test/fehler/absturz").exchange();

        assertThat(antwort).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(antwort).bodyText().doesNotContain("geheime technische Details");
    }
}
