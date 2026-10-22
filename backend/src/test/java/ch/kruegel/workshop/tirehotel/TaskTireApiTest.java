package ch.kruegel.workshop.tirehotel;

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

/** The tyre change of a task booked in the tyre hotel (13q). Fictitious customers and tyres only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TaskTireApiTest {

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
    private Customer huber;
    private Vehicle golf;
    private String place1;
    private String place2;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        huber = customers.save(CustomerTestData.local("Huber"));
        golf = vehicles.save(Vehicle.local(huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
        send("POST", "/api/tire-locations", """
                { "code": "OG", "name": "Werkstatt", "kind": "FLOOR", "sizeA": 1, "sizeB": 1, "sizeC": 2 }""");
        MvcTestResult places = mvc.get().uri("/api/tire-places").exchange();
        place1 = read(places, "$[0].id");
        place2 = read(places, "$[1].id");
    }

    @Test
    void theStoredSetIsMountedAndTheOneTakenOffGoesOntoItsPlace() {
        String winter = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "WINTER", "kind": "WHEELS", "brand": "Muster",
                  "depths": { "frontLeft": 6 }, "placeId": "%s" }""".formatted(huber.getId(), golf.getId(), place1)));
        String task = idOf(send("POST", "/api/tasks", task(true)));

        MvcTestResult before = mvc.get().uri("/api/tasks/" + task + "/tires").exchange();
        assertThat(before).bodyJson().extractingPath("$.inHotel[*].id").asArray().containsExactly(winter);
        assertThat(before).bodyJson().extractingPath("$.inHotel[0].place").isEqualTo("OG-A1-1");
        assertThat(before).bodyJson().extractingPath("$.mounted").isNull();

        MvcTestResult booked = send("POST", "/api/tasks/" + task + "/tires", """
                { "mounted": { "setId": "%s", "depths": { "frontLeft": 5.5, "frontRight": 5.5 } },
                  "removed": { "newSet": { "season": "SUMMER", "kind": "WHEELS", "rims": "ALU", "brand": "Sommer", "wheelBolts": true,
                                           "torque": 110, "pressureFront": 2.4, "pressureRear": 2.6 },
                               "depths": { "frontLeft": 3.5 }, "placeId": "%s" } }""".formatted(winter, place1));
        assertThat(booked).hasStatusOk();
        assertThat(booked).bodyJson().extractingPath("$.mounted.id").isEqualTo(winter);
        assertThat(booked).bodyJson().extractingPath("$.mounted.retrievedOn").isEqualTo(LocalDate.now().toString());
        assertThat(booked).bodyJson().extractingPath("$.mounted.state").isEqualTo("MOUNTED");
        assertThat(booked).bodyJson().extractingPath("$.mounted.depths.frontLeft").isEqualTo(5.5);
        // the wheels swap places
        assertThat(booked).bodyJson().extractingPath("$.removed.place").isEqualTo("OG-A1-1");
        assertThat(booked).bodyJson().extractingPath("$.removed.vehicle.licensePlate").isEqualTo("ZH 123456");
        assertThat(booked).bodyJson().extractingPath("$.removed.depths.frontLeft").isEqualTo(3.5);
        // FB-11, FB-17: what to mount the new set with
        assertThat(booked).bodyJson().extractingPath("$.removed.torque").isEqualTo(110);
        assertThat(booked).bodyJson().extractingPath("$.removed.pressureRear").isEqualTo(2.6);
        assertThat(booked).bodyJson().extractingPath("$.removed.wheelBolts").isEqualTo(true);
        // both sets of the car, wherever they are – newest first
        assertThat(mvc.get().uri("/api/vehicles/" + golf.getId() + "/tire-sets").exchange()).bodyJson().extractingPath("$[*].brand").asArray()
                .containsExactly("Sommer", "Muster");

        assertThat(mvc.get().uri("/api/tire-sets/" + winter + "/history").exchange()).bodyJson().extractingPath("$[*].kind").asArray()
                .containsExactly("STORED", "MEASURED", "RETRIEVED");
        // once per task
        assertThat(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "newSet": { "season": "SUMMER", "kind": "TIRES" } } }""")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void nextSeasonTheSameSetIsStoredAgainWithItsHistory() {
        String summer = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "SUMMER", "kind": "TIRES", "placeId": "%s" }"""
                .formatted(huber.getId(), golf.getId(), place1)));
        send("POST", "/api/tire-sets/" + summer + "/retrieve", "{}");
        String task = idOf(send("POST", "/api/tasks", task(true)));

        assertThat(mvc.get().uri("/api/tasks/" + task + "/tires").exchange()).bodyJson().extractingPath("$.outside[*].id").asArray()
                .containsExactly(summer);

        MvcTestResult booked = send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "setId": "%s", "depths": { "frontLeft": 4 }, "placeId": "%s" } }""".formatted(summer, place2));
        assertThat(booked).hasStatusOk();
        assertThat(booked).bodyJson().extractingPath("$.removed.id").isEqualTo(summer);
        assertThat(booked).bodyJson().extractingPath("$.removed.retrievedOn").isNull();
        assertThat(booked).bodyJson().extractingPath("$.removed.place").isEqualTo("OG-A1-2");
        assertThat(mvc.get().uri("/api/tire-sets/" + summer + "/history").exchange()).bodyJson().extractingPath("$[*].kind").asArray()
                .containsExactly("STORED", "RETRIEVED", "STORED");
    }

    @Test
    void checksTheTaskTheSetsAndThePlace() {
        String other = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "season": "WINTER", "kind": "TIRES", "placeId": "%s" }"""
                .formatted(customers.save(CustomerTestData.local("Meier")).getId(), place2)));
        String withoutTireChange = idOf(send("POST", "/api/tasks", task(false)));
        assertThat(send("POST", "/api/tasks/" + withoutTireChange + "/tires", """
                { "removed": { "newSet": { "season": "SUMMER", "kind": "TIRES" } } }""")).hasStatus(HttpStatus.CONFLICT);

        String task = idOf(send("POST", "/api/tasks", task(true)));
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", "{}"), "mounted");
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "mounted": { "setId": "%s" } }""".formatted(other)), "mounted.setId");
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "newSet": { "kind": "TIRES" } } }"""), "removed.newSet.season");
        // neither a set nor a new one
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "depths": { "frontLeft": 4 } } }"""), "removed");
        // Meier's set lies there
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "newSet": { "season": "SUMMER", "kind": "TIRES" }, "placeId": "%s" } }""".formatted(place2)), "placeId");
        // a place only when stored
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "newSet": { "season": "SUMMER", "kind": "TIRES" }, "store": false, "placeId": "%s" } }""".formatted(place1)),
                "removed.placeId");
        // nothing was booked by the refused requests
        assertThat(mvc.get().uri("/api/tasks/" + task + "/tires").exchange()).bodyJson().extractingPath("$.removed").isNull();
    }

    @Test
    void tyresTheCustomerBringsAndTakesHomeAreKeptWithTheirDepths() {
        // first change: the customer brings winter tyres and takes the summer ones home – nothing in the hotel
        String first = idOf(send("POST", "/api/tasks", task(true)));
        MvcTestResult booked = send("POST", "/api/tasks/" + first + "/tires", """
                { "mounted": { "newSet": { "season": "WINTER", "kind": "TIRES", "brand": "Muster", "year": 2021 },
                               "depths": { "frontLeft": 7, "frontRight": 7, "rearLeft": 7, "rearRight": 7 } },
                  "removed": { "newSet": { "season": "SUMMER", "kind": "TIRES", "brand": "Sommer" },
                               "depths": { "frontLeft": 3.2 }, "store": false } }""");
        assertThat(booked).hasStatusOk();
        assertThat(booked).bodyJson().extractingPath("$.mounted.state").isEqualTo("MOUNTED");
        assertThat(booked).bodyJson().extractingPath("$.mounted.storedOn").isNull();
        // the day they were measured – for the overview of the car's tyres
        assertThat(booked).bodyJson().extractingPath("$.mounted.measuredOn").isEqualTo(LocalDate.now().toString());
        assertThat(booked).bodyJson().extractingPath("$.removed.state").isEqualTo("WITH_CUSTOMER");
        assertThat(booked).bodyJson().extractingPath("$.removed.place").isNull();
        String summer = read(booked, "$.removed.id");
        String winter = read(booked, "$.mounted.id");
        // not in the hotel – but the car's tyres know them
        assertThat(mvc.get().uri("/api/tire-sets?inHotel=true").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/vehicles/" + golf.getId() + "/tire-sets").exchange()).bodyJson().extractingPath("$[*].state").asArray()
                .containsExactlyInAnyOrder("MOUNTED", "WITH_CUSTOMER");

        // next season: the summer tyres brought along again, the winter ones stored this time
        String second = idOf(send("POST", "/api/tasks", task(true)));
        MvcTestResult tires = mvc.get().uri("/api/tasks/" + second + "/tires").exchange();
        // the one on the car first
        assertThat(tires).bodyJson().extractingPath("$.outside[*].id").asArray().containsExactly(winter, summer);
        MvcTestResult again = send("POST", "/api/tasks/" + second + "/tires", """
                { "mounted": { "setId": "%s", "depths": { "frontLeft": 3.0 } },
                  "removed": { "setId": "%s", "depths": { "frontLeft": 6.5 }, "placeId": "%s" } }""".formatted(summer, winter, place1));
        assertThat(again).hasStatusOk();
        assertThat(again).bodyJson().extractingPath("$.mounted.state").isEqualTo("MOUNTED");
        assertThat(again).bodyJson().extractingPath("$.removed.state").isEqualTo("IN_HOTEL");
        assertThat(again).bodyJson().extractingPath("$.removed.place").isEqualTo("OG-A1-1");
        assertThat(mvc.get().uri("/api/tire-sets/" + summer + "/history").exchange()).bodyJson().extractingPath("$[*].kind").asArray()
                .containsExactly("RECORDED", "TAKEN_HOME", "MEASURED", "MOUNTED");

        // what each task booked – also once the sets moved on
        assertThat(mvc.get().uri("/api/tasks/" + first + "/tires").exchange()).bodyJson().extractingPath("$.removedAs").isEqualTo("TAKEN_HOME");
        assertThat(again).bodyJson().extractingPath("$.mountedAs").isEqualTo("MOUNTED");
        assertThat(again).bodyJson().extractingPath("$.removedAs").isEqualTo("STORED");

        // already on the car: not put on again
        String third = idOf(send("POST", "/api/tasks", task(true)));
        assertFieldError(send("POST", "/api/tasks/" + third + "/tires", """
                { "mounted": { "setId": "%s" } }""".formatted(summer)), "mounted.setId");
    }

    @Test
    void fromTheHotelOnTheOneOnTheCarHomeAndNotTwiceInOneTask() {
        String winter = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "WINTER", "kind": "WHEELS", "placeId": "%s" }"""
                .formatted(huber.getId(), golf.getId(), place1)));
        String summer = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "SUMMER", "kind": "WHEELS", "placeId": "%s" }"""
                .formatted(huber.getId(), golf.getId(), place2)));
        send("POST", "/api/tire-sets/" + summer + "/retrieve", "{}");
        String task = idOf(send("POST", "/api/tasks", task(true)));

        // winter from the hotel on, the summer set on the car home with the customer
        MvcTestResult booked = send("POST", "/api/tasks/" + task + "/tires", """
                { "mounted": { "setId": "%s" }, "removed": { "setId": "%s", "store": false } }""".formatted(winter, summer));
        assertThat(booked).hasStatusOk();
        assertThat(booked).bodyJson().extractingPath("$.mountedAs").isEqualTo("RETRIEVED");
        assertThat(booked).bodyJson().extractingPath("$.removed.state").isEqualTo("WITH_CUSTOMER");
        // a set already with the customer is not taken home again
        String second = idOf(send("POST", "/api/tasks", task(true)));
        assertFieldError(send("POST", "/api/tasks/" + second + "/tires", """
                { "removed": { "setId": "%s", "store": false } }""".formatted(summer)), "removed.setId");
    }

    @Test
    void theSetJustPutOnIsNotTakenOffAgainAndOnlyOneIsPutOn() {
        String winter = idOf(send("POST", "/api/tire-sets", """
                { "customerId": "%s", "vehicleId": "%s", "season": "WINTER", "kind": "WHEELS", "placeId": "%s" }"""
                .formatted(huber.getId(), golf.getId(), place1)));
        String task = idOf(send("POST", "/api/tasks", task(true)));
        send("POST", "/api/tasks/" + task + "/tires", "{ \"mounted\": { \"setId\": \"%s\" } }".formatted(winter));

        // later, in the same task: not the one just put on
        assertFieldError(send("POST", "/api/tasks/" + task + "/tires", """
                { "removed": { "setId": "%s", "store": false } }""".formatted(winter)), "removed.setId");
        // and no second one put on – also not a brought one
        assertThat(send("POST", "/api/tasks/" + task + "/tires", """
                { "mounted": { "newSet": { "season": "SUMMER", "kind": "TIRES" } } }""")).hasStatus(HttpStatus.CONFLICT);
    }

    private String task(boolean tireChange) {
        return """
                { "customerId": "%s", "vehicleId": "%s", "acceptedById": "%s", "date": "%s", "time": "08:00", "tireChange": %s %s }"""
                .formatted(huber.getId(), golf.getId(), chef, LocalDate.now(), tireChange, tireChange ? ", \"tireChangeKind\": \"WHEELS_STORED\"" : "");
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
        return read(response, "$.id");
    }

    private static String read(MvcTestResult response, String path) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), path);
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
