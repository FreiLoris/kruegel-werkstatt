package ch.kruegel.workshop.dataimport;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
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
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Import of another program's file from the outside (neutral 5) – fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class DataImportApiTest {

    /** A file as an other program might write it: own names, own order, street and number apart */
    private static final String FILE = """
            Kd-Nr;Nachname;Vorname;Strasse;Hausnr;PLZ/Ort;Natel;Kennzeichen;Marke;Typ;1. Inv.;Km-Stand;Rabatt
            17;Huber;Peter;Musterstrasse;1;8400 Winterthur;079 000 00 01;zh 12345;VW;Golf;31.03.2015;123'456;5
            17;Huber;Peter;Musterstrasse;1;8400 Winterthur;079 000 00 01;ZH-54321;Audi;A3;2019-06-01;;5
            18;Meier;Anna;Testweg;7;CH-8404 Winterthur;;;;;;;
            19;;;Ohne Name;1;8400 Winterthur;;;;;;;
            20;Keller;Urs;Probeweg;2;8405 Winterthur;;ZH 777;;;;;
            21;Frei;Eva;Probeweg;3;8405 Winterthur;;ZH 888;Seat;Ibiza;irgendwann;;
            """;
    /** Columns of {@link #FILE} → fields; "Kd-Nr" and "Rabatt" are not taken over */
    private static final String MAPPING = """
            [{"index":1,"field":"LAST_NAME"},{"index":2,"field":"FIRST_NAME"},{"index":3,"field":"STREET"},
             {"index":4,"field":"STREET"},{"index":5,"field":"POSTAL_CODE_CITY"},{"index":6,"field":"MOBILE"},
             {"index":7,"field":"LICENSE_PLATE"},{"index":8,"field":"MAKE"},{"index":9,"field":"MODEL"},
             {"index":10,"field":"FIRST_REGISTRATION"},{"index":11,"field":"MILEAGE"}]""";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void preview_showsTheColumnsAndSuggestsTheFields() {
        MvcTestResult response = mvc.post().uri("/api/data-import/preview")
                .multipart().file(file(FILE))
                .header(CurrentPerson.HEADER, chef)
                .exchange();

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.rowCount").isEqualTo(6);
        assertThat(response).bodyJson().extractingPath("$.charset").isEqualTo("UTF-8");
        assertThat(response).bodyJson().extractingPath("$.columns[*].suggested").asArray().containsExactly(
                null, "LAST_NAME", "FIRST_NAME", "STREET", "STREET", "POSTAL_CODE_CITY", "MOBILE", "LICENSE_PLATE",
                "MAKE", "MODEL", "FIRST_REGISTRATION", "MILEAGE", null);
        assertThat(response).bodyJson().extractingPath("$.columns[1].samples").asArray()
                .containsExactly("Huber", "Huber", "Meier", "", "Keller");
        // only the first five rows as samples
        assertThat(customers.count()).isZero();
    }

    @Test
    void dryRun_countsButStoresNothing() {
        MvcTestResult response = importFile(FILE, MAPPING, true);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.dryRun").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.customersCreated").isEqualTo(4);
        assertThat(response).bodyJson().extractingPath("$.vehiclesCreated").isEqualTo(3);
        assertThat(customers.count()).isZero();
        assertThat(vehicles.count()).isZero();
    }

    @Test
    void import_takesOverCustomersAndVehicles_asCustomersOfTheApp() {
        MvcTestResult response = importFile(FILE, MAPPING, false);

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.rowsRead").isEqualTo(6);
        assertThat(response).bodyJson().extractingPath("$.customersCreated").isEqualTo(4);
        assertThat(response).bodyJson().extractingPath("$.skipped").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.vehiclesCreated").isEqualTo(3);
        assertThat(response).bodyJson().extractingPath("$.vehiclesSkipped").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems").asArray().containsExactly(
                "Zeile 5: kein Name – nicht übernommen",
                "Zeile 6: Fahrzeug nicht übernommen – Marke und Modell fehlen",
                "Zeile 7: «1. Inverkehrsetzung» ist kein Datum – leer gelassen");

        Customer huber = customers.findAll().stream().filter(c -> "Huber".equals(c.getDetails().lastName())).findFirst().orElseThrow();
        assertThat(huber.getSource()).isEqualTo(RecordSource.LOCAL);
        assertThat(huber.getDetails().street()).isEqualTo("Musterstrasse 1");
        assertThat(huber.getDetails().postalCode()).isEqualTo("8400");
        assertThat(huber.getDetails().city()).isEqualTo("Winterthur");
        assertThat(huber.getDetails().mobile()).isEqualTo("079 000 00 01");

        // two rows of Huber: one customer with both cars
        assertThat(vehicles.findByCustomerIdOrderByActiveDescLicensePlateAsc(huber.getId()))
                .extracting(v -> v.getDetails().licensePlate()).containsExactly("ZH 12345", "ZH 54321");
        VehicleDetails golf = vehicles.findByCustomerIdOrderByActiveDescLicensePlateAsc(huber.getId()).getFirst().getDetails();
        assertThat(golf.firstRegistration()).isEqualTo(LocalDate.of(2015, 3, 31));
        assertThat(golf.mileageKm()).isEqualTo(123456);
    }

    @Test
    void importedTwice_nothingTwice() {
        importFile(FILE, MAPPING, false);

        MvcTestResult again = importFile(FILE, MAPPING, false);

        assertThat(again).bodyJson().extractingPath("$.customersCreated").isEqualTo(0);
        assertThat(again).bodyJson().extractingPath("$.customersExisting").isEqualTo(4);
        assertThat(again).bodyJson().extractingPath("$.vehiclesCreated").isEqualTo(0);
        assertThat(again).bodyJson().extractingPath("$.vehiclesExisting").isEqualTo(3);
        assertThat(customers.count()).isEqualTo(4);
        assertThat(vehicles.count()).isEqualTo(3);
    }

    @Test
    void aCustomerOrVehicleTheAppHas_isLeftAsItIs() {
        Customer meier = customers.save(Customer.local(CustomerTestData.person("Meier", "Anna")));
        vehicles.save(Vehicle.local(meier, new VehicleDetails("ZH 12345", "VW", "Golf", null, null, null, null, null, null, null)));
        String file = """
                Name;Vorname;Strasse;PLZ;Kennzeichen;Marke
                MEIER;anna;Musterstrasse  1;8400;;
                Huber;Peter;Testweg 1;8400;ZH 12345;VW
                """;
        String mapping = """
                [{"index":0,"field":"LAST_NAME"},{"index":1,"field":"FIRST_NAME"},{"index":2,"field":"STREET"},
                 {"index":3,"field":"POSTAL_CODE"},{"index":4,"field":"LICENSE_PLATE"},{"index":5,"field":"MAKE"}]""";

        MvcTestResult response = importFile(file, mapping, false);

        assertThat(response).bodyJson().extractingPath("$.customersExisting").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.customersCreated").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.vehiclesExisting").isEqualTo(1);
        assertThat(customers.findById(meier.getId()).orElseThrow().getDetails().lastName()).isEqualTo("Meier");
    }

    @Test
    void withoutHeaderRow_andWindowsCharacterSet() {
        byte[] file = "Müller;Zürich\n".getBytes(java.nio.charset.Charset.forName("windows-1252"));
        String settings = """
                {"columns":[{"index":0,"field":"LAST_NAME"},{"index":1,"field":"CITY"}],"charset":null,"firstRowIsData":true,"dryRun":false}""";

        MvcTestResult response = mvc.post().uri("/api/data-import")
                .multipart().file(new MockMultipartFile("file", "kunden.csv", null, file))
                .file(new MockMultipartFile("settings", "", MediaType.APPLICATION_JSON_VALUE, settings.getBytes(StandardCharsets.UTF_8)))
                .header(CurrentPerson.HEADER, chef)
                .exchange();

        assertThat(response).bodyJson().extractingPath("$.customersCreated").isEqualTo(1);
        assertThat(customers.findAll().getFirst().getDetails().city()).isEqualTo("Zürich");
    }

    @Test
    void aVehicleTheAppKnowsByPlate_isFoundAlsoWithChassisNumber() {
        Customer huber = customers.save(Customer.local(CustomerTestData.person("Huber", "Peter")));
        vehicles.save(Vehicle.local(huber, new VehicleDetails("ZH 12345", "VW", "Golf", null, null, null, null, null, null, null)));
        String file = """
                Name;Kennzeichen;Fahrgestellnummer;Marke
                Huber;ZH 12345;WVWZZZ1KZAW000001;VW
                Meier;ZH 999;WVWZZZ1KZAW000002;Audi
                Keller;ZH 999;;Audi
                """;
        String mapping = """
                [{"index":0,"field":"LAST_NAME"},{"index":1,"field":"LICENSE_PLATE"},{"index":2,"field":"VIN"},
                 {"index":3,"field":"MAKE"}]""";

        MvcTestResult response = importFile(file, mapping, false);

        assertThat(response).bodyJson().extractingPath("$.vehiclesExisting").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.vehiclesCreated").isEqualTo(1);
        // the same plate in the file again, once without chassis number: the same vehicle
        assertThat(response).bodyJson().extractingPath("$.vehiclesSkipped").isEqualTo(1);
        assertThat(vehicles.count()).isEqualTo(2);
    }

    @Test
    void aCustomerDeactivatedInTheApp_staysSo() {
        Customer meier = Customer.local(CustomerTestData.person("Meier", "Anna"));
        meier.deactivate();
        customers.save(meier);
        String file = """
                Name;Vorname;Strasse;PLZ;Marke
                Meier;Anna;Musterstrasse 1;8400;VW
                """;
        String mapping = """
                [{"index":0,"field":"LAST_NAME"},{"index":1,"field":"FIRST_NAME"},{"index":2,"field":"STREET"},
                 {"index":3,"field":"POSTAL_CODE"},{"index":4,"field":"MAKE"}]""";

        MvcTestResult response = importFile(file, mapping, false);

        assertThat(response).bodyJson().extractingPath("$.customersCreated").isEqualTo(0);
        assertThat(response).bodyJson().extractingPath("$.problems[0]").isEqualTo("Zeile 2: Kunde ist in der App deaktiviert – nicht übernommen");
        assertThat(customers.count()).isEqualTo(1);
        assertThat(vehicles.count()).isZero();
    }

    @Test
    void aNegativeMileage_staysEmpty_theVehicleIsTakenOver() {
        String file = """
                Name;Marke;Km
                Huber;VW;-5
                """;

        MvcTestResult response = importFile(file, """
                [{"index":0,"field":"LAST_NAME"},{"index":1,"field":"MAKE"},{"index":2,"field":"MILEAGE"}]""", false);

        assertThat(response).bodyJson().extractingPath("$.vehiclesCreated").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems[0]").isEqualTo("Zeile 2: «Kilometerstand» ist negativ – leer gelassen");
    }

    @Test
    void anUnclosedQuote_saysWhere() {
        MvcTestResult response = mvc.post().uri("/api/data-import/preview")
                .multipart().file(file("Name;Ort\nHuber;\"Winterthur\nMeier;Zürich\n"))
                .header(CurrentPerson.HEADER, chef)
                .exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").asString().contains("Zeile 2");
    }

    @Test
    void withoutNameOrCompany_refused() {
        MvcTestResult response = importFile(FILE, """
                [{"index":3,"field":"STREET"}]""", false);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").asString().contains("«Name» oder «Firma»");
    }

    @Test
    void aDateFromTwoColumns_refused() {
        MvcTestResult response = importFile(FILE, """
                [{"index":1,"field":"LAST_NAME"},{"index":10,"field":"FIRST_REGISTRATION"},{"index":11,"field":"FIRST_REGISTRATION"}]""", false);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").asString().contains("mehreren Spalten");
    }

    @Test
    void aColumnTheFileDoesNotHave_refused() {
        MvcTestResult response = importFile(FILE, """
                [{"index":40,"field":"LAST_NAME"}]""", false);

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").asString().contains("Spalte 41");
    }

    @Test
    void oldExcelFile_saysWhatToDo() {
        byte[] xls = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, 0, 0};

        MvcTestResult response = mvc.post().uri("/api/data-import/preview")
                .multipart().file(new MockMultipartFile("file", "alt.xls", null, xls))
                .header(CurrentPerson.HEADER, chef)
                .exchange();

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].message").asString().contains(".xlsx oder CSV");
    }

    @Test
    void importNeedsAPerson() {
        MvcTestResult response = mvc.post().uri("/api/data-import")
                .multipart().file(file(FILE))
                .file(settings(MAPPING, false))
                .exchange();

        assertThat(response).hasStatus(HttpStatus.FORBIDDEN);
    }

    private MvcTestResult importFile(String content, String columns, boolean dryRun) {
        return mvc.post().uri("/api/data-import")
                .multipart().file(file(content))
                .file(settings(columns, dryRun))
                .header(CurrentPerson.HEADER, chef)
                .exchange();
    }

    private static MockMultipartFile file(String content) {
        return new MockMultipartFile("file", "kunden.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private static MockMultipartFile settings(String columns, boolean dryRun) {
        String json = "{\"columns\":" + columns + ",\"charset\":null,\"firstRowIsData\":false,\"dryRun\":" + dryRun + "}";
        return new MockMultipartFile("settings", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8));
    }
}
