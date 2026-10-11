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
    void editingCanChangeTheLift() {
        create(liftJson(lift2));
        String id = idOf(createAt("09:00", liftJson(lift1)));

        MvcTestResult response = send("PUT", "/api/tasks/" + id, bodyAt("09:00", liftJson(lift2) + ", \"version\": 0"));

        assertThat(response).bodyJson().extractingPath("$.liftId").isEqualTo(lift2.getId().toString());
    }

    @Test
    void statusChangesWithoutVersion() {
        String id = idOf(create(null));

        MvcTestResult response = send("PUT", "/api/tasks/" + id + "/status", "{ \"status\": \"IN_PROGRESS\" }");

        assertThat(response).bodyJson().extractingPath("$.status").isEqualTo("IN_PROGRESS");
        assertFieldError(send("PUT", "/api/tasks/" + id + "/status", "{ \"status\": null }"), "status");
    }

    @Test
    void partsToOrderAreListedUntilTheyAreOrdered() {
        String waiting = idOf(createAt("09:00", "\"parts\": { \"description\": \"Bremsscheiben\", \"status\": \"TO_ORDER\" }"));
        createAt("10:00", "\"parts\": { \"description\": \"Filter\", \"status\": \"ORDERED\" }");
        String without = idOf(createAt("11:00", null));

        assertThat(mvc.get().uri("/api/tasks/parts-to-order").exchange()).bodyJson().extractingPath("$[*].id").asArray().containsExactly(waiting);

        MvcTestResult ordered = send("PUT", "/api/tasks/" + waiting + "/parts-status", "{ \"status\": \"ORDERED\" }");
        assertThat(ordered).bodyJson().extractingPath("$.parts.status").isEqualTo("ORDERED");
        // the day of the order is remembered
        assertThat(ordered).bodyJson().extractingPath("$.parts.orderedOn").isNotNull();
        assertThat(mvc.get().uri("/api/tasks/parts-to-order").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        // ticked off by mistake: back on the list, the day forgotten
        assertThat(send("PUT", "/api/tasks/" + waiting + "/parts-status", "{ \"status\": \"TO_ORDER\" }"))
                .bodyJson().extractingPath("$.parts.orderedOn").isNull();
        // a task without parts has nothing to order
        assertThat(send("PUT", "/api/tasks/" + without + "/parts-status", "{ \"status\": \"ORDERED\" }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void theAppAssignsTheTaskNumberYearAndRunningNumber() {
        String year = "%02d".formatted(LocalDate.now().getYear() % 100);

        MvcTestResult first = create(null);
        MvcTestResult second = createAt("09:00", null);

        assertThat(first).bodyJson().extractingPath("$.taskNumber").isEqualTo(year + "-0001");
        assertThat(second).bodyJson().extractingPath("$.taskNumber").isEqualTo(year + "-0002");
        // editing the task keeps its number
        assertThat(send("PUT", "/api/tasks/" + idOf(first), body("\"notes\": \"x\", \"version\": 0")))
                .bodyJson().extractingPath("$.taskNumber").isEqualTo(year + "-0001");
    }

    @Test
    void aSaveThatFailsTakesNoNumberAndANumberTypedByHandIsSkipped() {
        String year = "%02d".formatted(LocalDate.now().getYear() % 100);
        String first = idOf(create(null));
        // someone corrects the first number to what would be the next one
        send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \"%s-0002\" }".formatted(year));
        // refused (end before start) – must not use up a number
        assertFieldError(createAt("09:00", "\"endAt\": \"2026-10-15T08:00\""), "endAt");

        assertThat(createAt("09:00", null)).bodyJson().extractingPath("$.taskNumber").isEqualTo(year + "-0003");
    }

    @Test
    void taskNumberCanBeCorrectedButIsUniqueAndStays() {
        String first = idOf(create(null));
        String second = idOf(createAt("09:00", null));
        send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \" A-17 \" }");

        assertFieldError(send("PUT", "/api/tasks/" + second + "/task-number", "{ \"taskNumber\": \"A-17\" }"), "taskNumber");
        // the same number again on the same task is fine
        assertThat(send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \"A-17\" }"))
                .bodyJson().extractingPath("$.taskNumber").isEqualTo("A-17");
        // every task has a number – it cannot be removed
        assertFieldError(send("PUT", "/api/tasks/" + first + "/task-number", "{ \"taskNumber\": \"\" }"), "taskNumber");
    }

    @Test
    void anOpenTimeStillTakesTheLiftAndStaysWhenTheTaskIsMoved() {
        String open = idOf(create("\"timeOpen\": true, " + liftJson(lift1)));
        assertThat(mvc.get().uri("/api/tasks/" + open).exchange()).bodyJson().extractingPath("$.timeOpen").isEqualTo(true);

        // the lift is reserved like for any other appointment
        assertFieldError(create(liftJson(lift1)), "liftId");
        // dragged to another lift: still "Zeit offen"
        assertThat(send("PUT", "/api/tasks/" + open + "/schedule", scheduleJson(lift2, DAY, "10:00", DAY + "T11:00")))
                .bodyJson().extractingPath("$.timeOpen").isEqualTo(true);
        // the time is agreed after all
        assertThat(send("PUT", "/api/tasks/" + open, body("\"version\": 1")))
                .bodyJson().extractingPath("$.timeOpen").isEqualTo(false);
    }

    @Test
    void anOrderWithoutAppointmentWaitsInItsOwnListAndCanBePlannedLater() {
        String noDate = "{ \"customerId\": \"%s\", \"acceptedById\": \"%s\", \"workDescription\": \"Service\"%%s }"
                .formatted(huber.getId(), reto.getId());

        MvcTestResult created = send("POST", "/api/tasks", noDate.formatted(""));
        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.date").isNull();
        assertThat(created).bodyJson().extractingPath("$.endAt").isNull();
        // it has its number right away – the list must be able to name it
        assertThat(created).bodyJson().extractingPath("$.taskNumber").isNotNull();
        String id = idOf(created);
        // nothing may hang on a day that does not exist
        assertFieldError(send("POST", "/api/tasks", noDate.formatted(", " + liftJson(lift1))), "date");
        assertFieldError(send("POST", "/api/tasks", noDate.formatted(", \"waitingCustomer\": true")), "date");

        assertThat(mvc.get().uri("/api/tasks/without-appointment").exchange()).bodyJson().extractingPath("$[*].id").asArray().containsExactly(id);
        assertThat(mvc.get().uri("/api/tasks?from=2026-10-01&to=2026-10-31").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();

        // planned by editing it …
        assertThat(send("PUT", "/api/tasks/" + id, body("\"version\": 0, " + liftJson(lift1))))
                .bodyJson().extractingPath("$.date").isEqualTo(DAY);
        assertThat(mvc.get().uri("/api/tasks/without-appointment").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    @Test
    void aPlannedOrderCanBeTakenOutOfThePlanAndItsLiftIsFree() {
        String id = idOf(create(liftJson(lift1) + ", \"readyBy\": \"2026-10-15T16:30\", \"waitingCustomer\": true, \"mechanicId\": \"%s\""
                .formatted(reto.getId())));

        MvcTestResult removed = mvc.delete().uri("/api/tasks/" + id + "/appointment").header(CurrentPerson.HEADER, chef).exchange();

        assertThat(removed).hasStatusOk();
        assertThat(removed).bodyJson().extractingPath("$.date").isNull();
        assertThat(removed).bodyJson().extractingPath("$.liftId").isNull();
        assertThat(removed).bodyJson().extractingPath("$.readyBy").isNull();
        assertThat(removed).bodyJson().extractingPath("$.waitingCustomer").isEqualTo(false);
        // who works on it and what is to do stays
        assertThat(removed).bodyJson().extractingPath("$.mechanicId").isEqualTo(reto.getId().toString());
        // the lift is free for someone else
        assertThat(create(liftJson(lift1))).hasStatus(HttpStatus.CREATED);
        // dragged back into the plan: a first appointment
        assertThat(send("PUT", "/api/tasks/" + id + "/schedule", scheduleJson(lift2, DAY, "10:00", DAY + "T11:00")))
                .bodyJson().extractingPath("$.time").isEqualTo("10:00:00");
    }

    @Test
    void someoneMustHaveAcceptedTheOrder() {
        Employee gone = employees.save(new Employee(new EmployeeDetails("Weg", Role.MECHANIC, "#cccccc", null, 25,
                true, true, true), 3));
        String id = idOf(create(null));
        assertThat(mvc.get().uri("/api/tasks/" + id).exchange()).bodyJson().extractingPath("$.acceptedById").isEqualTo(reto.getId().toString());

        String without = "{ \"customerId\": \"%s\", \"date\": \"%s\", \"time\": \"10:00\" }".formatted(huber.getId(), DAY);
        assertFieldError(send("POST", "/api/tasks", without), "acceptedById");
        // changed to someone else – who may leave later without the task losing them
        String byGone = body("\"version\": 0").replace(reto.getId().toString(), gone.getId().toString());
        assertThat(send("PUT", "/api/tasks/" + id, byGone)).bodyJson().extractingPath("$.acceptedById").isEqualTo(gone.getId().toString());
        jdbc.update("UPDATE employee SET active = false WHERE name = 'Weg'");
        assertThat(send("PUT", "/api/tasks/" + id, byGone.replace("\"version\": 0", "\"version\": 1"))).hasStatusOk();
        // but not newly chosen
        assertFieldError(send("POST", "/api/tasks", bodyAt("11:00", null).replace(reto.getId().toString(), gone.getId().toString())), "acceptedById");
    }

    @Test
    void historyShowsTheLastTasksOfACustomerNewestFirst() {
        Customer meier = customers.save(CustomerTestData.local("Meier"));
        send("POST", "/api/tasks", body(null).replace(DAY, "2026-09-01"));
        send("POST", "/api/tasks", body("\"vehicleId\": \"%s\"".formatted(golf.getId())));
        send("POST", "/api/tasks", """
                { "customerId": "%s", "acceptedById": "%s", "date": "%s", "time": "08:00" }""".formatted(meier.getId(), reto.getId(), DAY));

        MvcTestResult response = mvc.get().uri("/api/tasks/history?customerId=" + huber.getId()).exchange();

        assertThat(response).bodyJson().extractingPath("$[*].date").asArray().containsExactly(DAY, "2026-09-01");
        assertThat(response).bodyJson().extractingPath("$[0].vehicle.licensePlate").isEqualTo("ZH 123456");
    }

    @Test
    void endIsOneHourAfterTheStartUnlessGivenAndMustBeAfterIt() {
        assertThat(create(null)).bodyJson().extractingPath("$.endAt").isEqualTo("2026-10-15T09:00:00");
        // a car waiting for parts may take its lift until the next day
        assertThat(create("\"endAt\": \"2026-10-16T12:00\"")).bodyJson().extractingPath("$.endAt").isEqualTo("2026-10-16T12:00:00");
        assertFieldError(create("\"endAt\": \"2026-10-15T08:00\""), "endAt");
    }

    @Test
    void aLiftTakesOneTaskAtATime() {
        String first = idOf(create(liftJson(lift1) + ", \"endAt\": \"2026-10-15T10:00\""));

        MvcTestResult overlapping = createAt("09:30", liftJson(lift1));
        assertFieldError(overlapping, "liftId");
        // says which task is in the way
        assertThat(overlapping).bodyJson().extractingPath("$.errors[0].message").asString()
                .isEqualTo("Lift 1 ist am 15.10.2026 von 08:00 bis 10:00 belegt (Huber Test)");
        // directly after, on another lift or without lift is fine
        assertThat(createAt("10:00", liftJson(lift1))).hasStatus(HttpStatus.CREATED);
        assertThat(createAt("09:30", liftJson(lift2))).hasStatus(HttpStatus.CREATED);
        assertThat(createAt("09:30", null)).hasStatus(HttpStatus.CREATED);
        // a task does not block itself when it is edited
        assertThat(send("PUT", "/api/tasks/" + first, body(liftJson(lift1) + ", \"endAt\": \"2026-10-15T09:45\", \"version\": 0")))
                .hasStatusOk();
        assertFieldError(send("PUT", "/api/tasks/" + first, body(liftJson(lift1) + ", \"endAt\": \"2026-10-15T10:30\", \"version\": 1")),
                "liftId");
    }

    @Test
    void schedulingSetsLiftStartAndEnd() {
        String id = idOf(create(liftJson(lift1)));

        MvcTestResult response = send("PUT", "/api/tasks/" + id + "/schedule", scheduleJson(lift2, DAY, "10:15", DAY + "T12:45"));

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.liftId").isEqualTo(lift2.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.time").isEqualTo("10:15:00");
        assertThat(response).bodyJson().extractingPath("$.endAt").isEqualTo("2026-10-15T12:45:00");
        // no lift is a place too
        assertThat(send("PUT", "/api/tasks/" + id + "/schedule", scheduleJson(null, DAY, "10:15", DAY + "T12:45")))
                .bodyJson().extractingPath("$.liftId").isNull();
    }

    @Test
    void schedulingChecksEndLiftAndTheExtraTimes() {
        String a = idOf(create(liftJson(lift1) + ", \"endAt\": \"2026-10-15T10:00\""));
        String b = idOf(createAt("11:00", liftJson(lift2) + ", \"readyBy\": \"2026-10-15T16:00\""));
        lift2.deactivate();
        lifts.save(lift2);

        assertFieldError(send("PUT", "/api/tasks/" + b + "/schedule", scheduleJson(lift2, DAY, "11:00", DAY + "T11:00")), "endAt");
        assertFieldError(send("PUT", "/api/tasks/" + b + "/schedule", scheduleJson(lift1, DAY, "09:00", DAY + "T12:00")), "liftId");
        assertFieldError(send("PUT", "/api/tasks/" + b + "/schedule", scheduleJson(lift2, DAY, "16:00", DAY + "T17:00")), "time");
        // its own lift stays usable although it is out of service now
        assertThat(send("PUT", "/api/tasks/" + b + "/schedule", scheduleJson(lift2, DAY, "12:00", DAY + "T13:00"))).hasStatusOk();
        assertFieldError(send("PUT", "/api/tasks/" + a + "/schedule", scheduleJson(lift2, DAY, "08:00", DAY + "T09:00")), "liftId");
    }

    @Test
    void schedulingSaysWhichExtraTimeNoLongerFits() {
        String id = idOf(createAt("13:00", "\"arrivesEarlier\": \"2026-10-15T07:00\", \"readyBy\": \"2026-10-15T16:00\""));

        assertThat(send("PUT", "/api/tasks/" + id + "/schedule", scheduleJson(null, DAY, "06:30", DAY + "T07:30")))
                .bodyJson().extractingPath("$.errors[0].message").asString().startsWith("liegt vor \u201eFahrzeug kommt früher\u201c (15.10.2026 07:00)");
        assertThat(send("PUT", "/api/tasks/" + id + "/schedule", scheduleJson(null, DAY, "16:30", DAY + "T17:30")))
                .bodyJson().extractingPath("$.errors[0].message").asString().startsWith("liegt nach \u201efertig bis\u201c (15.10.2026 16:00)");
    }

    @Test
    void toAnotherDayTheExtraTimesMoveAlongTheMfkAppointmentStays() {
        String moved = idOf(createAt("09:00", liftJson(lift1) + """
                , "arrivesEarlier": "2026-10-14T17:00", "readyBy": "2026-10-15T16:30",
                  "mfk": true, "mfkAppointment": "2026-10-15T10:00"
                """));

        MvcTestResult response = send("PUT", "/api/tasks/" + moved + "/schedule", scheduleJson(lift1, "2026-10-20", "09:00", "2026-10-20T10:00"));

        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$.arrivesEarlier").isEqualTo("2026-10-19T17:00:00");
        assertThat(response).bodyJson().extractingPath("$.readyBy").isEqualTo("2026-10-20T16:30:00");
        // booked at the inspection station – does not move with the workshop appointment
        assertThat(response).bodyJson().extractingPath("$.mfkAppointment").isEqualTo("2026-10-15T10:00:00");
    }

    @Test
    void theDayShowsTasksOfEarlierDaysThatStillTakeTheirLift() {
        send("POST", "/api/tasks", body(liftJson(lift1) + ", \"endAt\": \"2026-10-16T12:00\"").replace(DAY, "2026-10-14"));
        send("POST", "/api/tasks", body(liftJson(lift2) + ", \"endAt\": \"2026-10-15T00:00\"").replace(DAY, "2026-10-14"));
        send("POST", "/api/tasks", createAtBody("13:00"));
        send("POST", "/api/tasks", body(null).replace(DAY, "2026-10-16"));

        MvcTestResult response = mvc.get().uri("/api/tasks/day?date=" + DAY).exchange();

        // the one ending at midnight is over, tomorrow's one has not started
        assertThat(response).bodyJson().extractingPath("$[*].date").asArray().containsExactly("2026-10-14", DAY);
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

    private static String scheduleJson(Lift lift, String date, String time, String endAt) {
        String liftId = lift == null ? "null" : "\"" + lift.getId() + "\"";
        return "{ \"liftId\": %s, \"date\": \"%s\", \"time\": \"%s\", \"endAt\": \"%s\" }".formatted(liftId, date, time, endAt);
    }

    private String createAtBody(String time) {
        return bodyAt(time, null);
    }

    /** Task for Huber on {@link #DAY} at 08:00 plus the given JSON fields. */
    private String body(String moreFields) {
        return bodyAt("08:00", moreFields);
    }

    /** Task for Huber on {@link #DAY} at the given time – several tasks on one lift need different times. */
    private String bodyAt(String time, String moreFields) {
        String base = "\"customerId\": \"%s\", \"acceptedById\": \"%s\", \"date\": \"%s\", \"time\": \"%s\""
                .formatted(huber.getId(), reto.getId(), DAY, time);
        return "{ " + base + (moreFields == null ? "" : ", " + moreFields) + " }";
    }

    private MvcTestResult create(String moreFields) {
        return send("POST", "/api/tasks", body(moreFields));
    }

    private MvcTestResult createAt(String time, String moreFields) {
        return send("POST", "/api/tasks", bodyAt(time, moreFields));
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
