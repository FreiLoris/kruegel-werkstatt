package ch.kruegel.workshop.task;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeDetails;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.employee.Role;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.lift.LiftRepository;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.serviceitem.ServiceItemRepository;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
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

import static org.assertj.core.api.Assertions.assertThat;

/** Task API from the outside. Changes are made as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TaskApiTest {

    private static final String DAY = "2026-10-15";

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private LiftRepository lifts;

    @Autowired
    private ServiceItemRepository serviceItems;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Employee reto;
    private Customer huber;
    private Vehicle golf;
    private Lift lift1;
    private Lift lift2;
    private ServiceItem oil;
    private ServiceItem wipers;

    @BeforeEach
    void startWithMasterData() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        reto = employees.save(EmployeeTestData.employee("Reto", 1));
        huber = customers.save(CustomerTestData.local("Huber"));
        golf = vehicles.save(Vehicle.local(huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
        lift1 = lifts.save(new Lift("Lift 1", 0));
        lift2 = lifts.save(new Lift("Lift 2", 1));
        oil = serviceItems.save(new ServiceItem("Ölwechsel", 0));
        wipers = serviceItems.save(new ServiceItem("Wischblätter", 1));
    }

    @Test
    void createsTaskWithEverything() {
        MvcTestResult response = create("""
                "vehicleId": "%s", "mechanicId": "%s", "liftId": "%s",
                "arrivesEarlier": "2026-10-14T18:00", "readyBy": "2026-10-15T16:30", "waitingCustomer": true,
                "tireChange": true, "tireChangeKind": "WHEELS_STORED", "mfk": true, "mfkAppointment": "2026-10-15T10:00",
                "serviceItemIds": ["%s", "%s"],
                "parts": { "description": "Bremsscheiben vorne", "status": "ORDERED", "supplier": "Derendinger" },
                "workDescription": "Bremsen vorne", "notes": "Kunde ruft an"
                """.formatted(golf.getId(), reto.getId(), lift1.getId(), wipers.getId(), oil.getId()));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.status").isEqualTo("RECEIVED");
        assertThat(response).bodyJson().extractingPath("$.customer.lastName").isEqualTo("Huber");
        assertThat(response).bodyJson().extractingPath("$.vehicle.licensePlate").isEqualTo("ZH 123456");
        assertThat(response).bodyJson().extractingPath("$.time").isEqualTo("08:00:00");
        assertThat(response).bodyJson().extractingPath("$.arrivesEarlier").isEqualTo("2026-10-14T18:00:00");
        assertThat(response).bodyJson().extractingPath("$.waitingCustomer").isEqualTo(true);
        // in the order of the service item list, not of the request
        assertThat(response).bodyJson().extractingPath("$.serviceItemIds").asArray()
                .containsExactly(oil.getId().toString(), wipers.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.parts.supplier").isEqualTo("Derendinger");
        assertThat(response).bodyJson().extractingPath("$.createdBy").isEqualTo(chef);
    }

    @Test
    void newTasksGoToTheEndOfTheirLiftColumn() {
        String lift1Json = "\"liftId\": \"%s\"".formatted(lift1.getId());

        assertThat(create(lift1Json)).bodyJson().extractingPath("$.sortOrder").isEqualTo(0);
        assertThat(create(lift1Json)).bodyJson().extractingPath("$.sortOrder").isEqualTo(1);
        assertThat(create("\"liftId\": \"%s\"".formatted(lift2.getId()))).bodyJson().extractingPath("$.sortOrder").isEqualTo(0);
        // no lift yet: own column
        assertThat(create(null)).bodyJson().extractingPath("$.sortOrder").isEqualTo(0);
    }

    @Test
    void changesWithoutPersonAreRefused() {
        MvcTestResult response = mvc.post().uri("/api/tasks").contentType(MediaType.APPLICATION_JSON)
                .content(body(null)).exchange();

        assertThat(response).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void timesAroundTheAppointmentAreChecked() {
        assertFieldError(create("\"arrivesEarlier\": \"2026-10-15T09:00\""), "arrivesEarlier");
        assertFieldError(create("\"readyBy\": \"2026-10-15T07:00\""), "readyBy");
    }

    @Test
    void detailsOnlyWithTheirWork() {
        assertFieldError(create("\"tireChangeKind\": \"TIRES_BROUGHT\""), "tireChangeKind");
        assertFieldError(create("\"mfkAppointment\": \"2026-10-15T10:00\""), "mfkAppointment");
        assertFieldError(create("\"parts\": { \"description\": \" \", \"status\": \"TO_ORDER\" }"), "parts.description");
    }

    @Test
    void newlyChosenReferencesMustBeUsable() {
        Customer gone = CustomerTestData.local("Weg");
        gone.deactivate();
        customers.save(gone);
        Employee office = employees.save(new Employee(new EmployeeDetails("Büro", Role.OFFICE, "#cccccc", null, 25,
                false, true, true), 2));

        assertFieldError(send("POST", "/api/tasks", """
                { "customerId": "%s", "date": "%s", "time": "08:00" }""".formatted(gone.getId(), DAY)), "customerId");
        assertFieldError(create("\"mechanicId\": \"%s\"".formatted(office.getId())), "mechanicId");
        assertFieldError(create("\"vehicleId\": \"0199ffff-0000-7000-8000-000000000000\""), "vehicleId");
    }

    @Test
    void oldTaskStaysEditableWhenItsMechanicLeft() {
        String id = idOf(create("\"mechanicId\": \"%s\"".formatted(reto.getId())));
        reto.deactivate();
        employees.save(reto);

        MvcTestResult response = send("PUT", "/api/tasks/" + id, body("""
                "mechanicId": "%s", "notes": "neu", "version": 0""".formatted(reto.getId())));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.notes").isEqualTo("neu");
    }

    @Test
    void inactiveServiceItemOnlyIfAlreadyTicked() {
        String id = idOf(create("\"serviceItemIds\": [\"%s\"]".formatted(oil.getId())));
        oil.deactivate();
        wipers.deactivate();
        serviceItems.save(oil);
        serviceItems.save(wipers);

        assertThat(send("PUT", "/api/tasks/" + id, body("\"serviceItemIds\": [\"%s\"], \"version\": 0".formatted(oil.getId()))))
                .hasStatus(HttpStatus.OK);
        assertFieldError(send("PUT", "/api/tasks/" + id, body("\"serviceItemIds\": [\"%s\"], \"version\": 1".formatted(wipers.getId()))),
                "serviceItemIds");
    }

    @Test
    void editNeedsTheCurrentVersion() {
        String id = idOf(create(null));

        assertFieldError(send("PUT", "/api/tasks/" + id, body(null)), "version");
        assertThat(send("PUT", "/api/tasks/" + id, body("\"notes\": \"A\", \"version\": 0"))).hasStatus(HttpStatus.OK);
        // someone else saved in between → the old version is refused
        assertThat(send("PUT", "/api/tasks/" + id, body("\"notes\": \"B\", \"version\": 0"))).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void movingToAnotherLiftPutsTheTaskAtTheEnd() {
        create("\"liftId\": \"%s\"".formatted(lift2.getId()));
        String id = idOf(create("\"liftId\": \"%s\"".formatted(lift1.getId())));

        MvcTestResult response = send("PUT", "/api/tasks/" + id, body("\"liftId\": \"%s\", \"version\": 0".formatted(lift2.getId())));

        assertThat(response).bodyJson().extractingPath("$.liftId").isEqualTo(lift2.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.sortOrder").isEqualTo(1);
    }

    @Test
    void statusChangesWithoutVersion() {
        String id = idOf(create(null));

        MvcTestResult response = send("PUT", "/api/tasks/" + id + "/status", "{ \"status\": \"IN_PROGRESS\" }");

        assertThat(response).bodyJson().extractingPath("$.status").isEqualTo("IN_PROGRESS");
        assertFieldError(send("PUT", "/api/tasks/" + id + "/status", "{ \"status\": null }"), "status");
    }

    @Test
    void taskNumberCanBeGivenWhenCreatingAndEditing() {
        String first = idOf(create("\"taskNumber\": \" A-17 \""));

        assertThat(mvc.get().uri("/api/tasks/" + first).exchange()).bodyJson().extractingPath("$.taskNumber").isEqualTo("A-17");
        assertFieldError(create("\"taskNumber\": \"A-17\""), "taskNumber");
        // editing keeps its own number, and can change it
        assertThat(send("PUT", "/api/tasks/" + first, body("\"taskNumber\": \"A-17\", \"version\": 0"))).hasStatusOk();
        assertThat(send("PUT", "/api/tasks/" + first, body("\"taskNumber\": \"A-18\", \"version\": 0")))
                .bodyJson().extractingPath("$.taskNumber").isEqualTo("A-18");
    }

    @Test
    void taskNumberIsUniqueAndCanBeRemoved() {
        String first = idOf(create(null));
        String second = idOf(create(null));
        send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \" A-17 \" }");

        assertFieldError(send("PUT", "/api/tasks/" + second + "/task-number", "{ \"taskNumber\": \"A-17\" }"), "taskNumber");
        // the same number again on the same task is fine
        assertThat(send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \"A-17\" }"))
                .bodyJson().extractingPath("$.taskNumber").isEqualTo("A-17");
        assertThat(send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \"\" }"))
                .bodyJson().extractingPath("$.taskNumber").isNull();
    }

    @Test
    void deletesTask() {
        String id = idOf(create("\"serviceItemIds\": [\"%s\"]".formatted(oil.getId())));

        assertThat(mvc.delete().uri("/api/tasks/" + id).header(CurrentPerson.HEADER, chef).exchange())
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/tasks/" + id).exchange()).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void listsAPeriodByDayAndTime() {
        send("POST", "/api/tasks", body(null).replace(DAY, "2026-10-16"));
        send("POST", "/api/tasks", body(null).replace("08:00", "13:00"));
        send("POST", "/api/tasks", body(null).replace("08:00", "07:30"));
        send("POST", "/api/tasks", body(null).replace(DAY, "2026-10-20"));

        MvcTestResult response = mvc.get().uri("/api/tasks?from=2026-10-15&to=2026-10-16").exchange();

        assertThat(response).bodyJson().extractingPath("$[*].time").asArray()
                .containsExactly("07:30:00", "13:00:00", "08:00:00");
        assertThat(response).bodyJson().extractingPath("$[2].date").isEqualTo("2026-10-16");
    }

    @Test
    void historyShowsTheLastTasksOfACustomerNewestFirst() {
        Customer meier = customers.save(CustomerTestData.local("Meier"));
        send("POST", "/api/tasks", body(null).replace(DAY, "2026-09-01"));
        send("POST", "/api/tasks", body("\"vehicleId\": \"%s\"".formatted(golf.getId())));
        send("POST", "/api/tasks", """
                { "customerId": "%s", "date": "%s", "time": "08:00" }""".formatted(meier.getId(), DAY));

        MvcTestResult response = mvc.get().uri("/api/tasks/history?customerId=" + huber.getId()).exchange();

        assertThat(response).bodyJson().extractingPath("$[*].date").asArray().containsExactly(DAY, "2026-09-01");
        assertThat(response).bodyJson().extractingPath("$[0].vehicle.licensePlate").isEqualTo("ZH 123456");
    }

    @Test
    void movingWithinAColumnRenumbersTheWholeColumn() {
        String a = idOf(create(liftJson(lift1)));
        String b = idOf(create(liftJson(lift1)));
        String c = idOf(create(liftJson(lift1)));

        MvcTestResult response = send("PUT", "/api/tasks/" + c + "/move", moveJson(lift1, 0));

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$[*].id").asArray().containsExactly(c, a, b);
        assertThat(response).bodyJson().extractingPath("$[*].sortOrder").asArray().containsExactly(0, 1, 2);
    }

    @Test
    void movingToAnotherLiftClosesTheGapInTheOldColumn() {
        String a = idOf(create(liftJson(lift1)));
        String b = idOf(create(liftJson(lift1)));
        String x = idOf(create(liftJson(lift2)));

        MvcTestResult response = send("PUT", "/api/tasks/" + a + "/move", moveJson(lift2, 0));

        assertThat(response).bodyJson().extractingPath("$[*].id").asArray().containsExactly(a, x);
        assertThat(response).bodyJson().extractingPath("$[0].liftId").isEqualTo(lift2.getId().toString());
        // bug #5: the neighbour in the old column is saved too
        assertThat(mvc.get().uri("/api/tasks/" + b).exchange()).bodyJson().extractingPath("$.sortOrder").isEqualTo(0);
    }

    @Test
    void positionBeyondTheEndMeansAtTheEndAndNoLiftIsAColumnToo() {
        String a = idOf(create(liftJson(lift1)));
        String open = idOf(create(null));

        MvcTestResult response = send("PUT", "/api/tasks/" + a + "/move", "{ \"liftId\": null, \"position\": 99 }");

        assertThat(response).bodyJson().extractingPath("$[*].id").asArray().containsExactly(open, a);
        assertThat(response).bodyJson().extractingPath("$[1].liftId").isNull();
    }

    @Test
    void cannotMoveToALiftOutOfService() {
        String a = idOf(create(liftJson(lift1)));
        lift2.deactivate();
        lifts.save(lift2);

        assertFieldError(send("PUT", "/api/tasks/" + a + "/move", moveJson(lift2, 0)), "liftId");
        assertFieldError(send("PUT", "/api/tasks/" + a + "/move", "{ \"position\": -1 }"), "position");
    }

    @Test
    void movingToAnotherDayKeepsTheTimeAndTheDistanceOfTheExtraTimes() {
        String stays = idOf(create(liftJson(lift1)));
        String moved = idOf(create(liftJson(lift1) + """
                , "arrivesEarlier": "2026-10-14T17:00", "readyBy": "2026-10-15T16:30",
                  "mfk": true, "mfkAppointment": "2026-10-15T10:00"
                """));

        MvcTestResult response = send("PUT", "/api/tasks/" + moved + "/move",
                "{ \"liftId\": \"%s\", \"position\": 99, \"date\": \"2026-10-20\" }".formatted(lift1.getId()));

        assertThat(response).hasStatusOk();
        MvcTestResult task = mvc.get().uri("/api/tasks/" + moved).exchange();
        assertThat(task).bodyJson().extractingPath("$.date").isEqualTo("2026-10-20");
        assertThat(task).bodyJson().extractingPath("$.time").isEqualTo("08:00:00");
        assertThat(task).bodyJson().extractingPath("$.arrivesEarlier").isEqualTo("2026-10-19T17:00:00");
        assertThat(task).bodyJson().extractingPath("$.readyBy").isEqualTo("2026-10-20T16:30:00");
        // booked at the inspection station – does not move with the workshop appointment
        assertThat(task).bodyJson().extractingPath("$.mfkAppointment").isEqualTo("2026-10-15T10:00:00");
        // the old day closed the gap
        assertThat(mvc.get().uri("/api/tasks/" + stays).exchange()).bodyJson().extractingPath("$.sortOrder").isEqualTo(0);
    }

    @Test
    void searchFindsAllAppointmentsUpcomingFirst() {
        LocalDate today = LocalDate.now();
        send("POST", "/api/tasks", body(null).replace(DAY, today.minusDays(30).toString()));
        send("POST", "/api/tasks", body(null).replace(DAY, today.plusDays(60).toString()));
        send("POST", "/api/tasks", body("\"vehicleId\": \"%s\"".formatted(golf.getId())).replace(DAY, today.plusDays(10).toString()));

        MvcTestResult response = mvc.get().uri("/api/tasks/search?q=huber").exchange();

        assertThat(response).bodyJson().extractingPath("$.hits[*].date").asArray()
                .containsExactly(today.plusDays(10).toString(), today.plusDays(60).toString(), today.minusDays(30).toString());
        assertThat(response).bodyJson().extractingPath("$.more").isEqualTo(false);
        // plate without space, combined with the name
        assertThat(mvc.get().uri("/api/tasks/search?q=zh123456 huber").exchange())
                .bodyJson().extractingPath("$.hits").asArray().hasSize(1);
        // phone without spaces (test customers have "052 000 00 00")
        assertThat(mvc.get().uri("/api/tasks/search?q=0520000000").exchange())
                .bodyJson().extractingPath("$.hits").asArray().hasSize(3);
        assertFieldError(mvc.get().uri("/api/tasks/search?q=h").exchange(), "q");
    }

    @Test
    void periodIsLimited() {
        LocalDate from = LocalDate.parse(DAY);
        assertFieldError(mvc.get().uri("/api/tasks?from=%s&to=%s".formatted(from, from.minusDays(1))).exchange(), "to");
        assertFieldError(mvc.get().uri("/api/tasks?from=%s&to=%s".formatted(from, from.plusDays(92))).exchange(), "to");
        assertThat(mvc.get().uri("/api/tasks?from=%s&to=%s".formatted(from, from.plusDays(91))).exchange()).hasStatusOk();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private static String liftJson(Lift lift) {
        return "\"liftId\": \"%s\"".formatted(lift.getId());
    }

    private static String moveJson(Lift lift, int position) {
        return "{ \"liftId\": \"%s\", \"position\": %d }".formatted(lift.getId(), position);
    }

    /** Task for Huber on {@link #DAY} at 08:00 plus the given JSON fields. */
    private String body(String moreFields) {
        String base = "\"customerId\": \"%s\", \"date\": \"%s\", \"time\": \"08:00\"".formatted(huber.getId(), DAY);
        return "{ " + base + (moreFields == null ? "" : ", " + moreFields) + " }";
    }

    private MvcTestResult create(String moreFields) {
        return send("POST", "/api/tasks", body(moreFields));
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
