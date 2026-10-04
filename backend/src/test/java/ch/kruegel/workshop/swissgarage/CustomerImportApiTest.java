package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Address list import from the outside, with Excel files built in the test (fictitious data). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CustomerImportApiTest {

    private static final String[] HEADERS = {
            "Adressart", "Anrede", "Name", "Vorname", "Zusatz", "Strasse", "PLZ", "Ort", "Tel.1", "Handy", "E-Mail", "Adressnummer"};

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void importsGarageCustomersAndSkipsTheRest() {
        byte[] file = TestExcel.with(HEADERS)
                .row("Garage-Kunde", "Herr", "Huber", "Peter", null, "Musterstrasse 1", 8400, "Winterthur", "052 000 00 01", null, "p@example.ch", 1001)
                .row("Garage-Kunde", null, "Muster AG", null, "z. Hd. Keller", "Industriestr. 5", 8404, "Winterthur", null, null, null, 1002)
                .row("Lieferant", null, "Teile GmbH", null, null, null, null, null, null, null, null, 1003)
                .row("Garage-Kunde gesperrt", "Frau", "Meier", "Anna", null, null, null, null, null, null, null, 1004)
                .bytes();

        MvcTestResult response = upload(file, "Adrliste.xlsx");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.rowsRead").isEqualTo(4);
        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(2);
        assertThat(response).bodyJson().extractingPath("$.skipped").isEqualTo(2);
        assertThat(response).bodyJson().extractingPath("$.importedBy").isEqualTo(chef);
        assertThat(response).bodyJson().extractingPath("$.fileName").isEqualTo("Adrliste.xlsx");

        Customer huber = customers.findBySwissgarageNumber("1001").orElseThrow();
        assertThat(huber.getSource()).isEqualTo(RecordSource.SWISSGARAGE);
        // Numbers in Excel (postal code, address number) arrive without ".0"
        assertThat(huber.getDetails().postalCode()).isEqualTo("8400");
        // Like the old app: no company detection – the name stays the last name
        assertThat(customers.findBySwissgarageNumber("1002").orElseThrow().getDetails().displayName()).isEqualTo("Muster AG");
    }

    @Test
    void secondImportUpdatesKeepsAndDeactivates() {
        upload(TestExcel.with(HEADERS)
                .row("Garage-Kunde", "Herr", "Huber", "Peter", null, null, 8400, "Winterthur", "052 000 00 01", null, null, 1001)
                .row("Garage-Kunde", "Frau", "Meier", "Anna", null, null, 8400, "Winterthur", null, null, null, 1002)
                .row("Garage-Kunde", "Herr", "Weg", "Max", null, null, 8400, "Winterthur", null, null, null, 1003)
                .bytes(), "erster.xlsx");

        MvcTestResult second = upload(TestExcel.with(HEADERS)
                .row("Garage-Kunde", "Herr", "Huber", "Peter", null, null, 8400, "Winterthur", "052 999 99 99", null, null, 1001)
                .row("Garage-Kunde", "Frau", "Meier", "Anna", null, null, 8400, "Winterthur", null, null, null, 1002)
                .bytes(), "zweiter.xlsx");

        assertThat(second).bodyJson().extractingPath("$.updated").isEqualTo(1);
        assertThat(second).bodyJson().extractingPath("$.unchanged").isEqualTo(1);
        assertThat(second).bodyJson().extractingPath("$.deactivated").isEqualTo(1);
        assertThat(customers.findBySwissgarageNumber("1001").orElseThrow().getDetails().phone()).isEqualTo("052 999 99 99");
        assertThat(customers.findBySwissgarageNumber("1003").orElseThrow().isActive()).isFalse();
    }

    @Test
    void customerBackInTheExportIsReactivated() {
        byte[] withWeg = TestExcel.with(HEADERS)
                .row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001)
                .row("Garage-Kunde", null, "Weg", null, null, null, null, null, null, null, null, 1003).bytes();
        upload(withWeg, "a.xlsx");
        upload(TestExcel.with(HEADERS).row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001).bytes(), "b.xlsx");

        assertThat(upload(withWeg, "c.xlsx")).bodyJson().extractingPath("$.updated").isEqualTo(1);
        assertThat(customers.findBySwissgarageNumber("1003").orElseThrow().isActive()).isTrue();
    }

    @Test
    void localCustomersAreNeverTouched() {
        Customer local = customers.save(CustomerTestData.local("Laufkunde"));

        upload(TestExcel.with(HEADERS).row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001).bytes(), "a.xlsx");

        assertThat(customers.findById(local.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    void rowsWithProblemsAreReportedNotImported() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                .row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001)
                .row("Garage-Kunde", "Herr", null, "Ohne", null, null, null, null, null, null, null, 1002)
                .row("Garage-Kunde", null, "Doppelt", null, null, null, null, null, null, null, null, 1001)
                .row("Garage-Kunde", null, "Ohne Nummer", null, null, null, null, null, null, null, null, null)
                .bytes(), "a.xlsx");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems").asArray().containsExactly(
                "Zeile 3 (Adressnummer 1002): kein Name",
                "Zeile 4: Adressnummer 1001 kommt mehrfach vor",
                "Zeile 5: keine Adressnummer");
    }

    @Test
    void partialExportIsRefusedWithoutChanges() {
        // 30 known customers – then a file with only 5 of them (e.g. filtered list by mistake)
        TestExcel full = TestExcel.with(HEADERS);
        IntStream.rangeClosed(1, 30).forEach(i -> full.row("Garage-Kunde", null, "Kunde " + i, null, null, null, null, null, null, null, null, 1000 + i));
        upload(full.bytes(), "voll.xlsx");
        TestExcel partial = TestExcel.with(HEADERS);
        IntStream.rangeClosed(1, 5).forEach(i -> partial.row("Garage-Kunde", null, "Kunde " + i, null, null, null, null, null, null, null, null, 1000 + i));

        MvcTestResult response = upload(partial.bytes(), "teil.xlsx");

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.detail").asString().contains("5 von 30");
        assertThat(customers.findBySwissgarageNumber("1030").orElseThrow().isActive()).isTrue();
        assertThat(mvc.get().uri("/api/swissgarage-imports")).bodyJson().extractingPath("$").asArray().hasSize(1);
    }

    @Test
    void wrongFileIsFieldError() {
        assertThat(upload(TestExcel.with("Kennz", "Marke").row("ZH 1", "VW").bytes(), "Fahrzeug.xlsx"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].message").asString().contains("keine SwissGarage-Adressliste");
        assertThat(upload("kein Excel".getBytes(), "liste.csv"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("file");
    }

    @Test
    void importLogNewestFirst() {
        upload(TestExcel.with(HEADERS).row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001).bytes(), "erster.xlsx");
        upload(TestExcel.with(HEADERS).row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001).bytes(), "zweiter.xlsx");

        assertThat(mvc.get().uri("/api/swissgarage-imports")).bodyJson().extractingPath("$[*].fileName").asArray()
                .containsExactly("zweiter.xlsx", "erster.xlsx");
    }

    @Test
    void importNeedsAPerson() {
        MvcTestResult response = mvc.post().uri("/api/swissgarage-imports/customers")
                .multipart().file(new MockMultipartFile("file", "a.xlsx", null,
                        TestExcel.with(HEADERS).row("Garage-Kunde", null, "Huber", null, null, null, null, null, null, null, null, 1001).bytes()))
                .exchange();

        assertThat(response).hasStatus(HttpStatus.FORBIDDEN);
    }

    private MvcTestResult upload(byte[] content, String fileName) {
        return mvc.post().uri("/api/swissgarage-imports/customers")
                .multipart().file(new MockMultipartFile("file", fileName, null, content))
                .header(CurrentPerson.HEADER, chef)
                .exchange();
    }
}
