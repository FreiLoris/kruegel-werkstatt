package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarDetails;
import ch.kruegel.workshop.courtesycar.CourtesyCarRepository;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.task.Appointment;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskDetails;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.task.TaskWork;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;

/** Courtesy car bookings from the outside. Changes as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BookingApiTest {

    /** Always in the future – "return now" must lie before the pickup in one test */
    private static final LocalDate DATE = LocalDate.now().plusDays(10);
    private static final String DAY = DATE.toString();

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CourtesyCarRepository cars;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private TaskRepository tasks;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private CourtesyCar polo;
    private CourtesyCar fabia;
    private CourtesyCar retired;
    private Task task;

    @BeforeEach
    void startWithCarsAndATask() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        polo = cars.save(new CourtesyCar(new CourtesyCarDetails("Ersatzwagen 1", "VW Polo", "ZH 10001", null, null), 0));
        fabia = cars.save(new CourtesyCar(new CourtesyCarDetails("Ersatzwagen 2", "Skoda Fabia", null, null, null), 1));
        CourtesyCar old = new CourtesyCar(new CourtesyCarDetails("Alter Golf", null, null, null, null), 2);
        old.deactivate();
        retired = cars.save(old);
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        task = tasks.save(new Task(new TaskDetails(huber, null, Appointment.at(DATE, LocalTime.of(8, 0)), null, null,
                TaskWork.described(null), null)));
    }

    @Test
    void booksACarForATask() {
        MvcTestResult response = book(polo, "\"taskId\": \"%s\"".formatted(task.getId()), "08:00", "17:00");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.holderName").isEqualTo("Huber Test");
        assertThat(response).bodyJson().extractingPath("$.taskId").isEqualTo(task.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.blockedUntil").isEqualTo(DAY + "T17:00:00");
        assertThat(mvc.get().uri("/api/courtesy-car-bookings/task/" + task.getId()).exchange())
                .bodyJson().extractingPath("$[*].courtesyCarId").asArray().containsExactly(polo.getId().toString());
    }

    @Test
    void withoutTaskSomeoneMustBeNamed() {
        assertFieldError(book(polo, null, "08:00", "17:00"), "holder");
        assertThat(book(polo, "\"holder\": \"Frau Muster\"", "08:00", "17:00"))
                .bodyJson().extractingPath("$.holderName").isEqualTo("Frau Muster");
    }

    @Test
    void theSecondBookingAtTheSameTimeIsRefusedInWords() {
        book(polo, "\"taskId\": \"%s\"".formatted(task.getId()), "08:00", "17:00");

        MvcTestResult response = book(polo, "\"holder\": \"Frau Muster\"", "12:00", "18:00");

        assertThat(response).hasStatus(HttpStatus.CONFLICT);
        assertThat(response).bodyJson().extractingPath("$.detail").asString()
                .contains("Ersatzwagen 1").contains(DATE.format(DateTimeFormatter.ofPattern("dd.MM.yyyy")) + " 08:00").contains("an Huber Test");
        // back to back is fine
        assertThat(book(polo, "\"holder\": \"Frau Muster\"", "17:00", "18:00")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void availabilityIsTheOneCheckForEveryone() {
        book(polo, "\"holder\": \"Frau Muster\"", "08:00", "17:00");

        MvcTestResult response = availability("12:00", "14:00", null);

        // only cars in service
        assertThat(response).bodyJson().extractingPath("$[*].name").asArray().containsExactly("Ersatzwagen 1", "Ersatzwagen 2");
        assertThat(response).bodyJson().extractingPath("$[0].available").isEqualTo(false);
        assertThat(response).bodyJson().extractingPath("$[0].conflicts[0].holderName").isEqualTo("Frau Muster");
        assertThat(response).bodyJson().extractingPath("$[1].available").isEqualTo(true);
    }

    @Test
    void aBookingBeingMovedDoesNotBlockItself() {
        String id = idOf(book(polo, "\"holder\": \"Frau Muster\"", "08:00", "17:00"));

        assertThat(availability("12:00", "18:00", id)).bodyJson().extractingPath("$[0].available").isEqualTo(true);

        MvcTestResult moved = send("PUT", "/api/courtesy-car-bookings/" + id, bookingJson(polo, null, "12:00", "18:00", 0));
        assertThat(moved).hasStatusOk();
        assertThat(moved).bodyJson().extractingPath("$.pickupAt").isEqualTo(DAY + "T12:00:00");
        // the holder of a booking without task stays
        assertThat(moved).bodyJson().extractingPath("$.holderName").isEqualTo("Frau Muster");
    }

    @Test
    void movingIntoAnotherBookingIsRefusedAndNeedsTheVersion() {
        book(polo, "\"holder\": \"Herr Früh\"", "08:00", "12:00");
        String late = idOf(book(polo, "\"holder\": \"Frau Spät\"", "13:00", "17:00"));

        assertFieldError(send("PUT", "/api/courtesy-car-bookings/" + late, bookingJson(polo, null, "11:00", "17:00", null)), "version");
        assertThat(send("PUT", "/api/courtesy-car-bookings/" + late, bookingJson(polo, null, "11:00", "17:00", 0)))
                .hasStatus(HttpStatus.CONFLICT);
        // to the other car it works
        assertThat(send("PUT", "/api/courtesy-car-bookings/" + late, bookingJson(fabia, null, "11:00", "17:00", 0))).hasStatusOk();
    }

    @Test
    void anEarlyReturnFreesTheCarAndCanOnlyBeUndoneWhileTheTimeIsFree() {
        String id = idOf(book(polo, "\"holder\": \"Herr Früh\"", "08:00", "17:00"));

        MvcTestResult returned = send("POST", "/api/courtesy-car-bookings/" + id + "/return", "{ \"returnedAt\": \"%sT12:00\" }".formatted(DAY));
        assertThat(returned).bodyJson().extractingPath("$.blockedUntil").isEqualTo(DAY + "T12:00:00");
        assertThat(availability("13:00", "15:00", null)).bodyJson().extractingPath("$[0].available").isEqualTo(true);

        book(polo, "\"holder\": \"Frau Spät\"", "13:00", "15:00");
        MvcTestResult undo = mvc.delete().uri("/api/courtesy-car-bookings/" + id + "/return").header(CurrentPerson.HEADER, chef).exchange();
        assertThat(undo).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void returnBeforePickupIsAFieldErrorEmptyMeansNow() {
        String id = idOf(book(polo, "\"holder\": \"Herr Früh\"", "08:00", "17:00"));

        assertFieldError(send("POST", "/api/courtesy-car-bookings/" + id + "/return", "{ \"returnedAt\": \"%sT07:00\" }".formatted(DAY)), "returnedAt");
        // the booking lies in the future – "now" is before the pickup
        assertFieldError(send("POST", "/api/courtesy-car-bookings/" + id + "/return", "{}"), "returnedAt");
    }

    @Test
    void carsOutOfServiceCannotBeBooked() {
        assertFieldError(book(retired, "\"holder\": \"Frau Muster\"", "08:00", "17:00"), "courtesyCarId");
        assertFieldError(book(polo, "\"holder\": \"Frau Muster\"", "17:00", "08:00"), "returnAt");
    }

    @Test
    void cancellingAndDeletingTheTaskRemoveTheBooking() {
        String holderBooking = idOf(book(polo, "\"holder\": \"Frau Muster\"", "08:00", "10:00"));
        book(fabia, "\"taskId\": \"%s\"".formatted(task.getId()), "08:00", "17:00");

        assertThat(mvc.delete().uri("/api/courtesy-car-bookings/" + holderBooking).header(CurrentPerson.HEADER, chef).exchange())
                .hasStatus(HttpStatus.NO_CONTENT);
        mvc.delete().uri("/api/tasks/" + task.getId()).header(CurrentPerson.HEADER, chef).exchange();

        assertThat(mvc.get().uri("/api/courtesy-car-bookings?from=%sT00:00&to=%sT23:59".formatted(DAY, DAY)).exchange())
                .bodyJson().extractingPath("$").asArray().isEmpty();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult book(CourtesyCar car, String moreFields, String from, String to) {
        String fields = moreFields == null ? "" : ", " + moreFields;
        return send("POST", "/api/courtesy-car-bookings", """
                { "courtesyCarId": "%s", "pickupAt": "%sT%s", "returnAt": "%sT%s"%s }""".formatted(car.getId(), DAY, from, DAY, to, fields));
    }

    private static String bookingJson(CourtesyCar car, String holder, String from, String to, Integer version) {
        return """
                { "courtesyCarId": "%s", "pickupAt": "%sT%s", "returnAt": "%sT%s"%s%s }""".formatted(car.getId(), DAY, from, DAY, to,
                holder == null ? "" : ", \"holder\": \"" + holder + "\"",
                version == null ? "" : ", \"version\": " + version);
    }

    private MvcTestResult availability(String from, String to, String exclude) {
        return mvc.get().uri("/api/courtesy-car-bookings/availability?from=%sT%s&to=%sT%s%s".formatted(DAY, from, DAY, to,
                exclude == null ? "" : "&excludeBookingId=" + exclude)).exchange();
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        return request.header(CurrentPerson.HEADER, chef).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private static void assertFieldError(MvcTestResult response, String field) {
        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[*].field").asArray().contains(field);
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
