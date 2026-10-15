package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import static org.assertj.core.api.Assertions.assertThat;

/** The one-off takeover of the SwissGarage tyre hotel (FB-07), with Excel files built in the test (fictitious data). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TireHotelImportApiTest {

    /** The columns of the real export – with its second block "Anzahl, Art, ArzikelNr, Reifen" */
    private static final String[] HEADERS = {
            "Datum", "Lagerort", "Kennzeichen", "Marke/Typ", "Kunde", "Anzahl", "Art", "ArtikelNr", "Reifen", "VL", "VR", "vorne ok",
            "HL", "HR", "hinten ok", "Anzahl", "Art", "ArzikelNr", "Reifen", "Bemerkung", "RDKS", "Bem.Sommer", "Bem.Winter"};

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
    void startWithCustomersAndVehicles() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        Customer huber = customers.save(CustomerTestData.swissGarage("1001", "Huber"));
        customers.save(CustomerTestData.swissGarage("1002", "Muster"));
        vehicles.save(Vehicle.fromSwissGarage("5001", huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
    }

    @Test
    void takesOverTheSetsByPlateOrNameWithoutAPlace() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                // by plate (written without space), complete wheels, a second block and RDKS
                .row(46000, "Container", "zh123456", "VW Golf", "Huber Test", 4, "Winter-Alufelgen", null, "Muster Alpin 6 205/55R16 91H",
                        6, 6.5, "J", 5, 4.3, "J", 2, "Sommer-", null, "Muster Sport 205/55R16", null, "J", null, "Nagel HL")
                // by name (other word order), plate unknown; tyres only
                .row(46001, null, "SG 7890", "Opel Corsa", "Test Muster", null, "Sommer-", null, "185/65 R15 88T Beispiel Eco",
                        2.5, 2.5, "N", 3, 3, "N", null, null, null, null, null, "N", null, null)
                // nobody
                .row(46002, null, "TG 1", "Fiat Panda", "Niemand Bekannt", null, "Winter-", null, null, null, null, "J", null, null, "J",
                        null, null, null, null, null, "N", null, null)
                .bytes());

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.kind").isEqualTo("TIRE_HOTEL");
        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(2);
        assertThat(response).bodyJson().extractingPath("$.skipped").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems").asArray().anySatisfy(p -> assertThat(p.toString()).contains("Zeile 4: Kunde nicht gefunden"));

        MvcTestResult sets = mvc.get().uri("/api/tire-sets").exchange();
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].kind").asArray().containsExactly("WHEELS");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].rims").asArray().containsExactly("ALU");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].vehicle.licensePlate").asArray().containsExactly("ZH 123456");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].dimension").asArray().containsExactly("205/55R16 91H");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].model").asArray().containsExactly("Alpin 6");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].depths.rearRight").asArray().containsExactly(4.3);
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Huber')].remark").asArray().containsExactly(
                "Zweiter Eintrag SwissGarage: 2 × Sommer- Muster Sport 205/55R16 · RDKS-Sensoren · Winter: Nagel HL · Alter Lagerort: Container");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Muster')].kind").asArray().containsExactly("TIRES");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Muster')].vehicle").asArray().containsExactly((Object) null);
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Muster')].remark").asArray()
                .containsExactly("Kennzeichen laut SwissGarage: SG 7890 (Opel Corsa)");
        assertThat(sets).bodyJson().extractingPath("$[?(@.customer.lastName == 'Muster')].brand").asArray().containsExactly("Beispiel");
        // no place: the old ones do not fit the new places
        assertThat(sets).bodyJson().extractingPath("$[*].place").asArray().containsOnlyNulls();
    }

    @Test
    void aSecondRunTakesNothingTwice() {
        byte[] file = TestExcel.with(HEADERS)
                .row(46000, null, "ZH 123456", "VW Golf", "Huber Test", 4, "Winter-", null, null, 6, 6, "J", 6, 6, "J")
                .bytes();
        upload(file);

        MvcTestResult again = upload(file);

        assertThat(again).bodyJson().extractingPath("$.created").isEqualTo(0);
        assertThat(again).bodyJson().extractingPath("$.unchanged").isEqualTo(1);
        assertThat(mvc.get().uri("/api/tire-sets").exchange()).bodyJson().extractingPath("$").asArray().hasSize(1);
    }

    @Test
    void refusesAnotherFile() {
        MvcTestResult response = upload(TestExcel.with("Int.Nr.", "Marke").row(1, "VW").bytes());

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("file");
    }

    private MvcTestResult upload(byte[] content) {
        return mvc.post().uri("/api/swissgarage-imports/tire-hotel")
                .multipart().file(new MockMultipartFile("file", "Pneuhotel.xlsx", null, content))
                .header(CurrentPerson.HEADER, chef)
                .exchange();
    }
}
