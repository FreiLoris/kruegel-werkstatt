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
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Vehicle list import from the outside, with Excel files built in the test (fictitious data). */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class VehicleImportApiTest {

    /** Subset of the real export's columns (the real one has ~60) */
    private static final String[] HEADERS = {
            "Int.Nr.", "Kennz", "Marke", "Typ", "Chassis-Nr.", "Treibstoff", "Km aktuell", "Jahrg.", "1.Inv", "MFK", "Farbe", "Name", "Adressnummer"};

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private TransactionTemplate transaction;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Customer huber;

    @BeforeEach
    void startWithChefAndImportedCustomer() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        huber = customers.save(CustomerTestData.swissGarage("1001", "Huber"));
    }

    @Test
    void importsVehiclesAndLinksThemToTheirHolder() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                // dates as Excel day numbers, like the real export
                .row(5001, "ZH123456", "VW", "Golf", "WVWZZZ1KZ", "Benzin", 86000, 2019, 43539, 45000, "Grau", "Huber", 1001)
                .bytes(), "Fahrzeug.xlsx");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.kind").isEqualTo("VEHICLES");
        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems").asArray().isEmpty();

        transaction.executeWithoutResult(status -> {
            Vehicle golf = vehicles.findBySwissgarageNumber("5001").orElseThrow();
            VehicleDetails d = golf.getDetails();
            // "ZH123456" without space in the export → one written form
            assertThat(d.licensePlate()).isEqualTo("ZH 123456");
            assertThat(d.firstRegistration()).isEqualTo(LocalDate.of(2019, 3, 15));
            assertThat(d.lastMfk()).isEqualTo(LocalDate.of(2023, 3, 15));
            assertThat(d.modelYear()).isEqualTo(2019);
            assertThat(d.mileageKm()).isEqualTo(86000);
            assertThat(golf.getCustomer().getId()).isEqualTo(huber.getId());
        });
    }

    @Test
    void unknownHolderIsImportedWithoutHolderAndReported() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, null, null, null, null, null, "Unbekannt", 9999)
                .bytes(), "Fahrzeug.xlsx");

        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems[0]").asString().startsWith("1 Fahrzeuge ohne bekannten Halter");
        transaction.executeWithoutResult(status ->
                assertThat(vehicles.findBySwissgarageNumber("5001").orElseThrow().getCustomer()).isNull());
    }

    @Test
    void badSingleValueDoesNotLoseTheVehicle() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, -5, 1850, 900000, null, null, "Huber", 1001)
                .bytes(), "Fahrzeug.xlsx");

        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.problems").asArray().hasSize(3);
        VehicleDetails d = vehicles.findBySwissgarageNumber("5001").orElseThrow().getDetails();
        assertThat(d.mileageKm()).isNull();
        assertThat(d.modelYear()).isNull();
        assertThat(d.firstRegistration()).isNull();
    }

    @Test
    void rowsWithoutMakeAndModelAreSkippedLikeTheOldApp() {
        MvcTestResult response = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, null, null, null, null, null, "Huber", 1001)
                .row(5002, "ZH 2", null, null, null, null, null, null, null, null, null, "Huber", 1001)
                .bytes(), "Fahrzeug.xlsx");

        assertThat(response).bodyJson().extractingPath("$.created").isEqualTo(1);
        assertThat(response).bodyJson().extractingPath("$.skipped").isEqualTo(1);
    }

    @Test
    void secondImportUpdatesKeepsDeactivatesAndChangesHolder() {
        Customer meier = customers.save(CustomerTestData.swissGarage("1002", "Meier"));
        upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, 80000, null, null, null, null, "Huber", 1001)
                .row(5002, "ZH 2", "Audi", "A3", null, null, null, null, null, null, null, "Huber", 1001)
                .row(5003, "ZH 3", "Seat", "Ibiza", null, null, null, null, null, null, null, "Huber", 1001)
                .bytes(), "a.xlsx");

        MvcTestResult second = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, 90000, null, null, null, null, "Huber", 1001)
                .row(5002, "ZH 2", "Audi", "A3", null, null, null, null, null, null, null, "Meier", 1002)
                .bytes(), "b.xlsx");

        assertThat(second).bodyJson().extractingPath("$.updated").isEqualTo(2);
        assertThat(second).bodyJson().extractingPath("$.deactivated").isEqualTo(1);
        transaction.executeWithoutResult(status -> {
            assertThat(vehicles.findBySwissgarageNumber("5001").orElseThrow().getDetails().mileageKm()).isEqualTo(90000);
            assertThat(vehicles.findBySwissgarageNumber("5002").orElseThrow().getCustomer().getId()).isEqualTo(meier.getId());
            assertThat(vehicles.findBySwissgarageNumber("5003").orElseThrow().isActive()).isFalse();
        });

        MvcTestResult third = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, 90000, null, null, null, null, "Huber", 1001)
                .row(5002, "ZH 2", "Audi", "A3", null, null, null, null, null, null, null, "Meier", 1002)
                .bytes(), "c.xlsx");
        assertThat(third).bodyJson().extractingPath("$.unchanged").isEqualTo(2);
    }

    @Test
    void localVehiclesAreNeverTouched() {
        Vehicle local = vehicles.save(Vehicle.local(null, new VehicleDetails("ZH 9", "Toyota", null, null, null, null, null, null, null, null)));

        upload(TestExcel.with(HEADERS).row(5001, "ZH 1", "VW", "Golf", null, null, null, null, null, null, null, "Huber", 1001).bytes(), "a.xlsx");

        assertThat(vehicles.findById(local.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    void partialExportIsRefused() {
        TestExcel full = TestExcel.with(HEADERS);
        IntStream.rangeClosed(1, 30).forEach(i -> full.row(5000 + i, "ZH " + i, "VW", "Golf", null, null, null, null, null, null, null, "Huber", 1001));
        upload(full.bytes(), "voll.xlsx");

        MvcTestResult response = upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, null, null, null, null, null, "Huber", 1001).bytes(), "teil.xlsx");

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.detail").asString().contains("1 von 30 bekannten Fahrzeugen");
    }

    @Test
    void statusCountsOnlyActiveSwissGarageData() {
        upload(TestExcel.with(HEADERS)
                .row(5001, "ZH 1", "VW", "Golf", null, null, null, null, null, null, null, "Huber", 1001)
                .row(5002, "ZH 2", "Audi", "A3", null, null, null, null, null, null, null, "Unbekannt", 9999)
                .bytes(), "a.xlsx");
        customers.save(CustomerTestData.local("Lokal"));
        vehicles.save(Vehicle.local(null, new VehicleDetails("ZH 9", "Toyota", null, null, null, null, null, null, null, null)));

        MvcTestResult status = mvc.get().uri("/api/swissgarage-imports/status").exchange();

        assertThat(status).bodyJson().extractingPath("$.customers").isEqualTo(1);
        assertThat(status).bodyJson().extractingPath("$.vehicles").isEqualTo(2);
        assertThat(status).bodyJson().extractingPath("$.vehiclesWithoutHolder").isEqualTo(1);
    }

    @Test
    void addressListInsteadOfVehicleListIsFieldError() {
        assertThat(upload(TestExcel.with("Adressart", "Name", "Adressnummer").row("Garage-Kunde", "Huber", 1001).bytes(), "Adrliste.xlsx"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].message").asString().contains("keine SwissGarage-Fahrzeugliste");
    }

    private MvcTestResult upload(byte[] content, String fileName) {
        return mvc.post().uri("/api/swissgarage-imports/vehicles")
                .multipart().file(new MockMultipartFile("file", fileName, null, content))
                .header(CurrentPerson.HEADER, chef)
                .exchange();
    }
}
