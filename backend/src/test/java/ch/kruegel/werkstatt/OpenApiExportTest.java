package ch.kruegel.werkstatt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Schreibt die aktuelle API-Beschreibung nach {@code api/openapi.json} (Repo-Wurzel).
 *
 * <p>Die Datei ist der Vertrag zwischen Backend und Frontend und wird mit eingecheckt.
 * Ändert sich die API, ändert sich nach {@code ./mvnw test} auch diese Datei – und die
 * Änderung ist im Pull Request sichtbar. Die CI prüft, dass die eingecheckte Datei aktuell ist.
 *
 * <p>Danach im Frontend: {@code npm run api:generate} erzeugt daraus die TypeScript-Typen.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiExportTest {

    private static final Path ZIEL = Path.of("..", "api", "openapi.json");

    @Autowired
    private MockMvcTester mvc;

    @Test
    void schreibtApiBeschreibung() throws IOException {
        MvcTestResult antwort = mvc.get().uri("/api/openapi").exchange();
        assertThat(antwort).hasStatus(HttpStatus.OK);

        // Immer LF-Zeilenenden: Die Datei soll auf Windows und Linux (CI) byte-gleich entstehen.
        String json = antwort.getResponse().getContentAsString(StandardCharsets.UTF_8)
                .replace("\r\n", "\n")
                .strip() + "\n";

        Files.createDirectories(ZIEL.getParent());
        Files.writeString(ZIEL, json, StandardCharsets.UTF_8);
    }
}
