package ch.kruegel.workshop;

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
 * Writes the current API description to {@code api/openapi.json} (repository root).
 *
 * <p>The file is the contract between backend and frontend and is committed.
 * If the API changes, this file changes after {@code ./mvnw test} too – and the change
 * is visible in the pull request. CI checks that the committed file is up to date.
 *
 * <p>Then in the frontend: {@code npm run api:generate} generates the TypeScript types from it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiExportTest {

    private static final Path TARGET = Path.of("..", "api", "openapi.json");

    @Autowired
    private MockMvcTester mvc;

    @Test
    void writesApiDescription() throws IOException {
        MvcTestResult response = mvc.get().uri("/api/openapi").exchange();
        assertThat(response).hasStatus(HttpStatus.OK);

        // Always LF line endings: the file should come out byte-identical on Windows and Linux (CI).
        String json = response.getResponse().getContentAsString(StandardCharsets.UTF_8)
                .replace("\r\n", "\n")
                .strip() + "\n";

        Files.createDirectories(TARGET.getParent());
        Files.writeString(TARGET, json, StandardCharsets.UTF_8);
    }
}
