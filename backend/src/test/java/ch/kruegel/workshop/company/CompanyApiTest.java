package ch.kruegel.workshop.company;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/** Company profile API from the outside. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CompanyApiTest {

    /** Smallest valid PNG header – the content check only looks at the signature */
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
    private static final byte[] SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"1\" height=\"1\"/></svg>"
            .getBytes(StandardCharsets.UTF_8);

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithDefaultProfile() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void startsWithTheNameAndWithoutLogo() {
        MvcTestResult response = mvc.get().uri("/api/company").exchange();

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Krügel Fahrzeugtechnik");
        assertThat(response).bodyJson().extractingPath("$.logoUrl").isNull();
        assertThat(mvc.get().uri("/api/company/logo").exchange()).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void updatesNameAndContactData() {
        MvcTestResult response = put("""
                { "name": " Krügel Fahrzeugtechnik AG ", "street": "Teststrasse 1", "postalCode": "8400",
                  "city": "Winterthur", "phone": "052 000 00 00", "email": "", "version": 0 }""");

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Krügel Fahrzeugtechnik AG");
        assertThat(response).bodyJson().extractingPath("$.email").isNull();
        assertThat(response).bodyJson().extractingPath("$.version").isEqualTo(1);
    }

    @Test
    void nameIsRequiredAndVersionIsChecked() {
        assertThat(put("{ \"name\": \" \", \"version\": 0 }")).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        put("{ \"name\": \"A\", \"version\": 0 }");
        assertThat(put("{ \"name\": \"B\", \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void uploadsAndServesTheLogo() {
        MvcTestResult upload = uploadLogo(PNG, "logo.png");

        assertThat(upload).hasStatusOk();
        assertThat(upload).bodyJson().extractingPath("$.logoUrl").asString().startsWith("/api/company/logo?v=");

        MvcTestResult image = mvc.get().uri("/api/company/logo").exchange();
        assertThat(image).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(image.getResponse().getContentAsByteArray()).isEqualTo(PNG);
        assertThat(image.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
    }

    @Test
    void typeComesFromTheContentNotTheFileName() {
        assertThat(uploadLogo(SVG, "logo.png")).hasStatusOk();
        assertThat(mvc.get().uri("/api/company/logo").exchange()).hasContentType("image/svg+xml");

        assertThat(uploadLogo("kein Bild".getBytes(StandardCharsets.UTF_8), "logo.png"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("file");
    }

    @Test
    void logoMayBeAtMostOneMegabyte() {
        byte[] big = new byte[CompanyLogoStore.MAX_BYTES + 1];
        System.arraycopy(PNG, 0, big, 0, PNG.length);

        assertThat(uploadLogo(big, "gross.png")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void removesTheLogo() {
        uploadLogo(PNG, "logo.png");

        MvcTestResult response = mvc.delete().uri("/api/company/logo").header(CurrentPerson.HEADER, chef).exchange();

        assertThat(response).bodyJson().extractingPath("$.logoUrl").isNull();
        assertThat(mvc.get().uri("/api/company/logo").exchange()).hasStatus(HttpStatus.NOT_FOUND);
    }

    private MvcTestResult put(String json) {
        return mvc.put().uri("/api/company").header(CurrentPerson.HEADER, chef)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult uploadLogo(byte[] content, String fileName) {
        return mvc.put().uri("/api/company/logo")
                .multipart().file(new MockMultipartFile("file", fileName, null, content))
                .header(CurrentPerson.HEADER, chef)
                .exchange();
    }
}
