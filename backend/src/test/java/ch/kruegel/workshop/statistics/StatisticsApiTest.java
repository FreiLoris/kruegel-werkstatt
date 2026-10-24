package ch.kruegel.workshop.statistics;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.config.TimeConfig;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeDetails;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.employee.Role;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** The statistics page (15a), today being Sunday 25 October 2026. Fictitious customers only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class StatisticsApiTest {

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-10-25T08:00:00Z"), TimeConfig.TIME_ZONE);
    }

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

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
    }

    @Test
    void anEmptyWorkshopHasZerosAndNoRecords() {
        MvcTestResult stats = stats();

        assertThat(stats).hasStatusOk();
        assertThat(stats).bodyJson().extractingPath("$.today").isEqualTo("2026-10-25");
        assertThat(stats).bodyJson().extractingPath("$.tasks.total").isEqualTo(0);
        assertThat(stats).bodyJson().extractingPath("$.tasks.perMonth.length()").isEqualTo(12);
        assertThat(stats).bodyJson().extractingPath("$.tasks.perMonth[11].label").isEqualTo("2026-10");
        assertThat(stats).bodyJson().extractingPath("$.tasks.perWeekday").isEqualTo(List.of(0, 0, 0, 0, 0, 0, 0));
        assertThat(stats).bodyJson().extractingPath("$.tasks.busiestDay").isNull();
        assertThat(stats).bodyJson().extractingPath("$.tasks.averageMinutes").isNull();
        assertThat(stats).bodyJson().extractingPath("$.vehicles.oldest").isNull();
        assertThat(stats).bodyJson().extractingPath("$.vehicles.averageAgeYears").isNull();
        assertThat(stats).bodyJson().extractingPath("$.team.nextBirthday").isNull();
        assertThat(stats).bodyJson().extractingPath("$.tires.oldestYear").isNull();
    }

    @Test
    void countsTasksByMonthWeekdayAndPeople() {
        Employee anna = employees.save(EmployeeTestData.employee("Anna", 0));
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        Customer meier = customers.save(CustomerTestData.local("Meier"));
        // two on Monday 19 October 08:00 (one hour each), one on Tuesday 6 October, one on Monday 3 March 2025, one without appointment
        task(huber, "2026-10-19", "08:00", anna, "DONE");
        task(huber, "2026-10-19", "08:00", null, "RECEIVED");
        task(huber, "2026-10-06", "10:00", anna, "RECEIVED");
        task(meier, "2025-03-03", "07:00", null, "DONE");
        jdbc.update("""
                INSERT INTO task (id, version, created_at, updated_at, customer_id, status, vehicle_location, waiting_customer, tire_change, mfk)
                VALUES (?, 0, now(), now(), ?, 'RECEIVED', 'AT_CUSTOMER', false, false, false)""", UUID.randomUUID(), meier.getId());

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.tasks.total").isEqualTo(5);
        assertThat(stats).bodyJson().extractingPath("$.tasks.thisYear").isEqualTo(3);
        assertThat(stats).bodyJson().extractingPath("$.tasks.thisMonth").isEqualTo(3);
        assertThat(stats).bodyJson().extractingPath("$.tasks.done").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tasks.firstAppointment").isEqualTo("2025-03-03");
        assertThat(stats).bodyJson().extractingPath("$.tasks.perMonth[11].count").isEqualTo(3);
        // March 2025 is more than 12 months ago
        assertThat(stats).bodyJson().extractingPath("$.tasks.perMonth[0].label").isEqualTo("2025-11");
        assertThat(stats).bodyJson().extractingPath("$.tasks.perWeekday").isEqualTo(List.of(3, 1, 0, 0, 0, 0, 0));
        assertThat(stats).bodyJson().extractingPath("$.tasks.perHour[0].label").isEqualTo("07");
        assertThat(stats).bodyJson().extractingPath("$.tasks.perHour[1].count").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tasks.busiestDay.label").isEqualTo("2026-10-19");
        assertThat(stats).bodyJson().extractingPath("$.tasks.busiestDay.count").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tasks.mechanics[0].label").isEqualTo("Anna");
        assertThat(stats).bodyJson().extractingPath("$.tasks.mechanics[0].count").isEqualTo(2);
        // Meier has two tasks too, but Huber three
        assertThat(stats).bodyJson().extractingPath("$.tasks.regulars[0].label").isEqualTo("Huber Test");
        assertThat(stats).bodyJson().extractingPath("$.tasks.regulars.length()").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tasks.averageMinutes").isEqualTo(60);
    }

    @Test
    void vehicleMakesCountTogetherWhateverTheSpelling() {
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        car(huber, "ZH 1", "VW", "Golf", LocalDate.of(2016, 10, 25), 100_000);
        car(huber, "ZH 2", "VW", "Polo", LocalDate.of(2020, 10, 25), 50_000);
        car(huber, "AG 3", "vw ", "golf", null, null);
        car(huber, "TG 4", "Fiat", "500", LocalDate.of(1972, 5, 1), 250_000);

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.vehicles.total").isEqualTo(4);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.makes[0].label").isEqualTo("VW");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.makes[0].count").isEqualTo(3);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.models[0].count").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.cantons[0].label").isEqualTo("ZH");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.oldest.make").isEqualTo("Fiat");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.oldest.year").isEqualTo(1972);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.mostKm.mileageKm").isEqualTo(250_000);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.totalKm").isEqualTo(400_000);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.withMileage").isEqualTo(3);
    }

    @Test
    void cantonsOnlyFromSwissPlates_andTheOldestByModelYearIfThatIsAll() {
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        car(huber, "ZH 1", "VW", "Golf", LocalDate.of(2016, 1, 1), null);
        car(huber, "ZH 2", "VW", "Golf", LocalDate.of(2016, 1, 1), null);
        // Greek and German – not Graubünden
        car(huber, "GR ABC-123", "Opel", "Corsa", LocalDate.of(2016, 1, 1), null);
        car(huber, "D M AB 1234", "Opel", "Astra", LocalDate.of(2016, 1, 1), null);
        vehicles.save(Vehicle.local(huber, new VehicleDetails("TG 5", "Citroën", "2CV", null, null, 1965, null, null, null, null)));

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.vehicles.cantons.length()").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.vehicles.cantons[0].label").isEqualTo("ZH");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.cantons[1].label").isEqualTo("TG");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.oldest.model").isEqualTo("2CV");
        assertThat(stats).bodyJson().extractingPath("$.vehicles.oldest.year").isEqualTo(1965);
    }

    @Test
    void newThisYearByTheSwissDay() {
        Customer newYear = customers.save(CustomerTestData.local("Neujahr"));
        Customer oldYear = customers.save(CustomerTestData.local("Silvester"));
        // 00:30 on 1 January in Zurich – but still 2025 in UTC
        jdbc.update("UPDATE customer SET created_at = '2025-12-31T23:30:00Z' WHERE id = ?", newYear.getId());
        jdbc.update("UPDATE customer SET created_at = '2025-12-31T22:30:00Z' WHERE id = ?", oldYear.getId());

        assertThat(stats()).bodyJson().extractingPath("$.customers.newThisYear").isEqualTo(1);
    }

    @Test
    void theTyreHotelRankingsCountTheSetsInTheHotel() {
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        String winter = tireSet(huber, "IN_HOTEL", "WINTER", "Nokian", 2018, 4.0);
        tireSet(huber, "IN_HOTEL", "WINTER", "nokian", 2020, 6.0);
        // mounted: counted as a set, not in the hotel's rankings
        tireSet(huber, "MOUNTED", "SUMMER", "Pirelli", 2010, 7.0);
        jdbc.update("INSERT INTO tire_set_event (id, version, created_at, updated_at, tire_set_id, kind, happened_on) "
                + "VALUES (?, 0, now(), now(), cast(? AS uuid), 'STORED', '2026-04-10')", UUID.randomUUID(), winter);
        jdbc.update("INSERT INTO tire_set_event (id, version, created_at, updated_at, tire_set_id, kind, happened_on) "
                + "VALUES (?, 0, now(), now(), cast(? AS uuid), 'STORED', '2025-10-10')", UUID.randomUUID(), winter);

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.tires.sets").isEqualTo(3);
        assertThat(stats).bodyJson().extractingPath("$.tires.seasons.length()").isEqualTo(1);
        assertThat(stats).bodyJson().extractingPath("$.tires.seasons[0].count").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tires.brands[0].count").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.tires.averageDepthMm").isEqualTo(5.0);
        assertThat(stats).bodyJson().extractingPath("$.tires.oldestYear").isEqualTo(2018);
        assertThat(stats).bodyJson().extractingPath("$.tires.eventsThisYear[0].count").isEqualTo(1);
    }

    @Test
    void courtesyCarDaysUpToTheRealReturn_anOpenOneUpToToday() {
        UUID car = UUID.randomUUID();
        jdbc.update("INSERT INTO courtesy_car (id, version, created_at, updated_at, name, active, sort_order) VALUES (?, 0, now(), now(), 'Panda', true, 0)", car);
        // back two days early: 1–3 October = 3 days
        booking(car, "2026-10-01T08:00", "2026-10-05T18:00", "2026-10-03T17:00");
        // back two days late: 6–9 October = 4 days, not the 2 planned
        booking(car, "2026-10-06T08:00", "2026-10-07T18:00", "2026-10-09T17:00");
        // still out, planned until the 30th: 20–25 October (today) = 6 days
        booking(car, "2026-10-20T08:00", "2026-10-30T18:00", null);
        // not started yet
        booking(car, "2026-11-02T08:00", "2026-11-03T18:00", null);

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.material.courtesyBookings").isEqualTo(4);
        assertThat(stats).bodyJson().extractingPath("$.material.courtesyDays").isEqualTo(13);
        assertThat(stats).bodyJson().extractingPath("$.material.courtesyCars[0].label").isEqualTo("Panda");
    }

    @Test
    void deliveryTimeOnlyFromWhatArrived() {
        shoppingItem("ARRIVED", "2026-10-01", "2026-10-03");
        shoppingItem("ARRIVED", "2026-10-01", "2026-10-05");
        shoppingItem("ORDERED", "2026-10-01", null);

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.material.shoppingItems").isEqualTo(3);
        assertThat(stats).bodyJson().extractingPath("$.material.averageDeliveryDays").isEqualTo(3.0);
    }

    @Test
    void theNextBirthdayIsTodayOrLater() {
        employees.save(new Employee(details("Beat", LocalDate.of(1990, 10, 24)), 0));
        employees.save(new Employee(details("Carla", LocalDate.of(1985, 11, 2)), 1));

        MvcTestResult stats = stats();

        assertThat(stats).bodyJson().extractingPath("$.team.employees").isEqualTo(2);
        assertThat(stats).bodyJson().extractingPath("$.team.nextBirthday.name").isEqualTo("Carla");
        assertThat(stats).bodyJson().extractingPath("$.team.nextBirthday.date").isEqualTo("2026-11-02");
        assertThat(stats).bodyJson().extractingPath("$.team.nextBirthday.age").isEqualTo(41);
    }

    @Test
    void aLeapDayBirthdayIsCelebratedOnThe28thInACommonYear() {
        assertThat(StatisticsService.nextOccurrence(LocalDate.of(2000, 2, 29), LocalDate.of(2027, 1, 10)))
                .isEqualTo(LocalDate.of(2027, 2, 28));
        assertThat(StatisticsService.nextOccurrence(LocalDate.of(2000, 2, 29), LocalDate.of(2027, 3, 1)))
                .isEqualTo(LocalDate.of(2028, 2, 29));
    }

    private static EmployeeDetails details(String name, LocalDate birthday) {
        return new EmployeeDetails(name, Role.MECHANIC, "#9fc8f0", birthday, 25, true, true, true);
    }

    private void task(Customer customer, String date, String time, Employee mechanic, String status) {
        jdbc.update("""
                        INSERT INTO task (id, version, created_at, updated_at, customer_id, status, vehicle_location,
                                          waiting_customer, tire_change, mfk, appointment_date, appointment_time, appointment_end, mechanic_id)
                        VALUES (?, 0, now(), now(), ?, ?, 'AT_WORKSHOP', false, false, false,
                                cast(? AS date), cast(? AS time), cast(? AS date) + cast(? AS time) + interval '1 hour', ?)""",
                UUID.randomUUID(), customer.getId(), status, date, time, date, time, mechanic == null ? null : mechanic.getId());
    }

    private String tireSet(Customer customer, String state, String season, String brand, int year, double depth) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                        INSERT INTO tire_set (id, version, created_at, updated_at, customer_id, state, season, kind, hub_caps, wheel_bolts,
                                              brand, year, depth_fl, depth_fr, depth_rl, depth_rr, stored_on)
                        VALUES (?, 0, now(), now(), ?, ?, ?, 'WHEELS', false, false, ?, ?, ?, ?, ?, ?, '2026-04-10')""",
                id, customer.getId(), state, season, brand, year, depth, depth, depth, depth);
        return id.toString();
    }

    private void booking(UUID car, String pickup, String plannedReturn, String returned) {
        jdbc.update("""
                        INSERT INTO courtesy_car_booking (id, version, created_at, updated_at, courtesy_car_id, holder, pickup_at, return_at, returned_at)
                        VALUES (?, 0, now(), now(), ?, 'Muster', cast(? AS timestamp), cast(? AS timestamp), cast(? AS timestamp))""",
                UUID.randomUUID(), car, pickup, plannedReturn, returned);
    }

    private void shoppingItem(String status, String orderedOn, String arrivedOn) {
        jdbc.update("""
                        INSERT INTO shopping_item (id, version, created_at, updated_at, description, quantity, status, ordered_on, arrived_on)
                        VALUES (?, 0, now(), now(), 'Bremsklötze', 1, ?, cast(? AS date), cast(? AS date))""",
                UUID.randomUUID(), status, orderedOn, arrivedOn);
    }

    private void car(Customer owner, String plate, String make, String model, LocalDate firstRegistration, Integer km) {
        vehicles.save(Vehicle.local(owner, new VehicleDetails(plate, make, model, null, firstRegistration, null, km, null, null, null)));
    }

    private MvcTestResult stats() {
        return mvc.get().uri("/api/statistics").exchange();
    }
}
