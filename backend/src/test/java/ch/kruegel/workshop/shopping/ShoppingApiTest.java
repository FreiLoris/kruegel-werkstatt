package ch.kruegel.workshop.shopping;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** The shopping list rebuilt (FB-20) and the parts of a task (FB-19). Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class ShoppingApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private VehicleRepository vehicles;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private String erich;
    private String task;

    @BeforeEach
    void startWithATask() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        erich = employees.save(EmployeeTestData.employee("Erich", 1)).getId().toString();
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        Vehicle golf = vehicles.save(Vehicle.local(huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
        task = idOf(send("POST", "/api/tasks", """
                { "customerId": "%s", "vehicleId": "%s", "acceptedById": "%s", "date": "%s", "time": "08:00" }"""
                .formatted(huber.getId(), golf.getId(), chef, LocalDate.now())));
    }

    @Test
    void theQuickEntryLinksTheTaskAndGivesTheOneWhoOrdersATodo() {
        MvcTestResult created = create("""
                "description": "Bremsscheiben vorne", "partNumber": "0986479S27", "quantity": 2, "orderById": "%s", "taskId": "%s\""""
                .formatted(erich, task));

        assertThat(created).hasStatus(HttpStatus.CREATED);
        assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("TO_ORDER");
        assertThat(created).bodyJson().extractingPath("$.recordedById").isEqualTo(chef);
        // which task: number, customer and plate (FB-19)
        assertThat(created).bodyJson().extractingPath("$.task.customerName").isEqualTo("Huber Test");
        assertThat(created).bodyJson().extractingPath("$.task.licensePlate").isEqualTo("ZH 123456");

        MvcTestResult todos = mvc.get().uri("/api/todos?assigneeId=" + erich).exchange();
        assertThat(todos).bodyJson().extractingPath("$[*].text").asArray().containsExactly("Bestellen: 2× Bremsscheiben vorne (Nr. 0986479S27)");
        assertThat(todos).bodyJson().extractingPath("$[0].shoppingItemId").isEqualTo(idOf(created));
        assertThat(todos).bodyJson().extractingPath("$[0].task.id").isEqualTo(task);
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).contains("shopping-items", "todos");
    }

    @Test
    void theWayOfDeliveryIsKeptAsText() {
        String item = idOf(create("\"description\": \"Ölfilter\", \"delivery\": \" Tagesexpress \""));
        assertThat(get(item)).bodyJson().extractingPath("$.delivery").isEqualTo("Tagesexpress");
        assertFieldError(create("\"description\": \"Ölfilter\", \"delivery\": \"%s\"".formatted("x".repeat(41))), "delivery");
    }

    @Test
    void orderedTicksTheTodoOffAndBackOpensIt() {
        String item = idOf(create("\"description\": \"Ölfilter\", \"orderById\": \"%s\"".formatted(erich)));

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"ORDERED\" }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNotNull();
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isEqualTo(LocalDate.now().toString());

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"TO_ORDER\" }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNull();
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isNull();

        // the history: who set what when
        MvcTestResult history = mvc.get().uri("/api/shopping-items/" + item + "/entries").exchange();
        assertThat(history).bodyJson().extractingPath("$[*].status").asArray().containsExactly("ORDERED", "TO_ORDER");
        assertThat(history).bodyJson().extractingPath("$[0].by").isEqualTo(chef);
    }

    @Test
    void tickingTheTodoOrdersThePositionGivingItAwayChangesWhoOrders() {
        String item = idOf(create("\"description\": \"Ölfilter\", \"orderById\": \"%s\"".formatted(erich)));
        String todo = read(todoOf(erich), "$[0].id");

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": true }");
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("ORDERED");
        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": false }");
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("TO_ORDER");

        send("PUT", "/api/todos/" + todo + "/assignee", "{ \"assigneeId\": \"%s\" }".formatted(chef));
        assertThat(get(item)).bodyJson().extractingPath("$.orderById").isEqualTo(chef);
    }

    @Test
    void theTodoOfAPositionIsChangedOnTheShoppingListOnly() {
        create("\"description\": \"Ölfilter\", \"orderById\": \"%s\"".formatted(erich));
        String todo = read(todoOf(erich), "$[0].id");

        assertThat(send("PUT", "/api/todos/" + todo, "{ \"text\": \"anders\", \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
        assertThat(send("DELETE", "/api/todos/" + todo, null)).hasStatus(HttpStatus.CONFLICT);
        // nobody orders = no to-do: that is cleared on the position
        assertThat(send("PUT", "/api/todos/" + todo + "/assignee", "{ \"assigneeId\": null }")).hasStatus(HttpStatus.CONFLICT);
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Bestellen: Ölfilter");
    }

    @Test
    void undoingTheTodoOfAnArrivedPartMeansNotOrderedAfterAll() {
        String item = idOf(create("\"description\": \"Ölfilter\", \"orderById\": \"%s\"".formatted(erich)));
        String todo = read(todoOf(erich), "$[0].id");
        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"ARRIVED\" }");

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": false }");
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("TO_ORDER");
        assertThat(get(item)).bodyJson().extractingPath("$.arrivedOn").isNull();
    }

    @Test
    void editingWithoutAStateKeepsItAndTheDayOfOrder() {
        String item = idOf(create("\"description\": \"Ölfilter\", \"status\": \"ORDERED\", \"orderedOn\": \"2026-10-20\""));
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isEqualTo("2026-10-20");

        send("PUT", "/api/shopping-items/" + item, body("\"description\": \"Ölfilter 2\", \"version\": 0"));
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("ORDERED");
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isEqualTo("2026-10-20");

        // back to "to order": no day of order, even if one is sent
        send("PUT", "/api/shopping-items/" + item, body("\"description\": \"Ölfilter 2\", \"status\": \"TO_ORDER\", \"orderedOn\": \"2026-10-20\", \"version\": 1"));
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isNull();
    }

    @Test
    void withoutSomeoneWhoOrdersThereIsNoTodo() {
        String item = idOf(create("\"description\": \"Kaffee und Milch\""));
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();

        MvcTestResult assigned = send("PUT", "/api/shopping-items/" + item, body("\"description\": \"Kaffee\", \"orderById\": \"%s\", \"version\": 0"
                .formatted(erich)));
        assertThat(assigned).hasStatusOk();
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[*].text").asArray().containsExactly("Bestellen: Kaffee");

        send("PUT", "/api/shopping-items/" + item, body("\"description\": \"Kaffee\", \"version\": 1"));
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    @Test
    void notesAndTheListsOpenArrivedAndPerTask() {
        String forTask = idOf(create("\"description\": \"Kupplungssatz\", \"taskId\": \"%s\"".formatted(task)));
        String ordered = idOf(create("\"description\": \"Bremsflüssigkeit\", \"status\": \"ORDERED\""));
        String arrived = idOf(create("\"description\": \"Wischerblätter\", \"status\": \"ARRIVED\""));

        MvcTestResult note = send("POST", "/api/shopping-items/" + forTask + "/entries", "{ \"text\": \"Lieferant: erst ab Mi lieferbar\" }");
        assertThat(note).hasStatus(HttpStatus.CREATED);
        assertThat(note).bodyJson().extractingPath("$.by").isEqualTo(chef);

        // to order first, then ordered
        assertThat(mvc.get().uri("/api/shopping-items").exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(forTask, ordered);
        assertThat(mvc.get().uri("/api/shopping-items?arrived=true").exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(arrived);
        assertThat(get(arrived)).bodyJson().extractingPath("$.arrivedOn").isEqualTo(LocalDate.now().toString());
        assertThat(mvc.get().uri("/api/shopping-items?taskId=" + task).exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(forTask);
        // several tasks at once ("Ohne Termin"), whatever their state
        assertThat(mvc.get().uri("/api/shopping-items?taskIds=" + task + "," + ordered).exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(forTask);
    }

    @Test
    void theTodoIsOpenWhileWeAreUpAndSaysWhatToDo() {
        // FB-28: quote asked → the supplier is up; Rückfrage / quote received → we are
        String item = idOf(create("\"description\": \"Werkzeugkiste\", \"orderById\": \"%s\"".formatted(erich)));

        // the note goes with the change of the position
        send("PUT", "/api/shopping-items/" + item, body(("\"description\": \"Werkzeugkiste\", \"orderById\": \"%s\", \"status\": \"QUOTE_REQUESTED\", "
                + "\"statusNote\": \"Offerte per Mail angefragt\", \"version\": 0").formatted(erich)));
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNotNull();
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isNull();

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"INFO_NEEDED\" }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNull();
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Infos an Lieferant liefern: Werkzeugkiste");

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"QUOTE_RECEIVED\" }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Offerte prüfen: Werkzeugkiste");

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"ORDERED\" }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNotNull();
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Bestellen: Werkzeugkiste");

        // the note right after its state in the history
        MvcTestResult history = mvc.get().uri("/api/shopping-items/" + item + "/entries").exchange();
        assertThat(history).bodyJson().extractingPath("$[0].status").isEqualTo("QUOTE_REQUESTED");
        assertThat(history).bodyJson().extractingPath("$[1].text").isEqualTo("Offerte per Mail angefragt");
    }

    @Test
    void tickingOffTheRueckfrageGivesItBackToTheSupplier() {
        String item = idOf(create("\"description\": \"Werkzeugkiste\", \"status\": \"INFO_NEEDED\", \"orderById\": \"%s\"".formatted(erich)));
        String todo = read(todoOf(erich), "$[0].id");

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": true }");

        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("QUOTE_REQUESTED");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].doneAt").isNotNull();
    }

    @Test
    void undoingTheTodoGoesBackToWhereWeWereUpLastWithItsText() {
        String item = idOf(create("\"description\": \"Werkzeugkiste\", \"status\": \"INFO_NEEDED\", \"orderById\": \"%s\"".formatted(erich)));
        String todo = read(todoOf(erich), "$[0].id");

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": true }");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Offerte angefragt: Werkzeugkiste");
        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": false }");

        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("INFO_NEEDED");
        assertThat(todoOf(erich)).bodyJson().extractingPath("$[0].text").isEqualTo("Infos an Lieferant liefern: Werkzeugkiste");
    }

    @Test
    void tickingOffTheQuoteOrdersItUndoingMakesItAQuoteAgain() {
        String item = idOf(create("\"description\": \"Werkzeugkiste\", \"status\": \"QUOTE_RECEIVED\", \"orderById\": \"%s\"".formatted(erich)));
        String todo = read(todoOf(erich), "$[0].id");

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": true }");
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("ORDERED");
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isEqualTo(LocalDate.now().toString());

        send("PUT", "/api/todos/" + todo + "/done", "{ \"done\": false }");
        assertThat(get(item)).bodyJson().extractingPath("$.status").isEqualTo("QUOTE_RECEIVED");
        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isNull();
    }

    @Test
    void whileTheSupplierIsUpThereIsNoTodoToCreate() {
        create("\"description\": \"Werkzeugkiste\", \"status\": \"QUOTE_REQUESTED\", \"orderById\": \"%s\"".formatted(erich));

        assertThat(mvc.get().uri("/api/todos?done=true").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    @Test
    void cancelledBeforeAnOrderGetsNoDayOfOrder() {
        String item = idOf(create("\"description\": \"Felgen\", \"status\": \"CANCELLED\""));

        send("PUT", "/api/shopping-items/" + item, body("\"description\": \"Felgen\", \"orderedOn\": \"2026-10-20\", \"version\": 0"));

        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isNull();
    }

    @Test
    void cancelledIsDoneKeepsTheDayOfOrderAndIsListedWithTheArrivedOnes() {
        String item = idOf(create("\"description\": \"Felgen\", \"status\": \"ORDERED\", \"orderedOn\": \"2026-10-20\", \"orderById\": \"%s\""
                .formatted(erich)));

        send("PUT", "/api/shopping-items/" + item + "/status", "{ \"status\": \"CANCELLED\" }");

        assertThat(get(item)).bodyJson().extractingPath("$.orderedOn").isEqualTo("2026-10-20");
        assertThat(get(item)).bodyJson().extractingPath("$.arrivedOn").isNull();
        assertThat(mvc.get().uri("/api/shopping-items").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/shopping-items?arrived=true").exchange()).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactly(item);
    }

    @Test
    void theTaskIsFoundByItsParts() {
        create("\"description\": \"Kupplungssatz\", \"taskId\": \"%s\"".formatted(task));

        assertThat(mvc.get().uri("/api/tasks/search?q=kupplungssatz").exchange()).bodyJson().extractingPath("$.hits[*].id").asArray()
                .containsExactly(task);
    }

    @Test
    void checksWhatIsEntered() {
        Employee apprentice = employees.save(new Employee(new EmployeeDetails("Lehrling", Role.MECHANIC, "#cccccc", null, 25,
                true, false, false), 2));

        assertFieldError(create("\"description\": \" \""), "description");
        assertFieldError(create("\"description\": \"x\", \"quantity\": 0"), "quantity");
        assertFieldError(send("POST", "/api/shopping-items", "{ \"description\": \"x\" }"), "recordedById");
        // gets a to-do – must be selectable for to-dos
        assertFieldError(create("\"description\": \"x\", \"orderById\": \"%s\"".formatted(apprentice.getId())), "orderById");
        assertFieldError(create("\"description\": \"x\", \"supplierId\": \"01a00000-0000-7000-8000-000000000000\""), "supplierId");
        assertFieldError(send("POST", "/api/shopping-items/0199ffff-0000-7000-8000-000000000000/entries", "{ \"text\": \"\" }"), "text");
    }

    @Test
    void aDeletedSupplierOrArticleLeavesThePositionDeletingItTakesItsTodo() {
        String supplier = idOf(send("POST", "/api/suppliers", "{ \"name\": \"Muster Teile AG\" }"));
        String article = idOf(send("POST", "/api/stock-items", "{ \"name\": \"Ölfilter\", \"category\": \"SPARE_PART\" }"));
        String item = idOf(create("\"description\": \"Ölfilter\", \"orderById\": \"%s\", \"stockItemId\": \"%s\", \"supplierId\": \"%s\""
                .formatted(erich, article, supplier)));

        send("DELETE", "/api/suppliers/" + supplier, null);
        send("DELETE", "/api/stock-items/" + article, null);
        assertThat(get(item)).bodyJson().extractingPath("$.supplierId").isNull();
        assertThat(get(item)).bodyJson().extractingPath("$.stockItemId").isNull();

        assertThat(send("DELETE", "/api/shopping-items/" + item, null)).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /** A position recorded by the chef plus the given JSON fields */
    private MvcTestResult create(String fields) {
        return send("POST", "/api/shopping-items", body(fields));
    }

    private String body(String fields) {
        return "{ \"recordedById\": \"%s\", %s }".formatted(chef, fields);
    }

    private MvcTestResult get(String item) {
        return mvc.get().uri("/api/shopping-items/" + item).exchange();
    }

    /** The to-dos of a person – the open ones, else the done ones (a ticked one must still be found) */
    private MvcTestResult todoOf(String person) {
        MvcTestResult open = mvc.get().uri("/api/todos?assigneeId=" + person).exchange();
        return read(open, "$.length()").equals("0") ? mvc.get().uri("/api/todos?done=true&assigneeId=" + person).exchange() : open;
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            case "DELETE" -> mvc.delete().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
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
            return String.valueOf((Object) JsonPath.read(response.getResponse().getContentAsString(), path));
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
