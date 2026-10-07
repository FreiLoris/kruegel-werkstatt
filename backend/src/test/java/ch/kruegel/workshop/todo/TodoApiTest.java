package ch.kruegel.workshop.todo;

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

import static org.assertj.core.api.Assertions.assertThat;

/** To-do API from the outside. Changes are made as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class TodoApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private TaskRepository tasks;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private Employee reto;
    private Task task;

    @BeforeEach
    void startWithPeopleAndATask() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        reto = employees.save(EmployeeTestData.employee("Reto", 1));
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        task = tasks.save(new Task(new TaskDetails(huber, null, Appointment.at(LocalDate.of(2026, 10, 15), LocalTime.of(8, 0)),
                null, null, TaskWork.described(null), null)));
        task.assignTaskNumber("A-17");
        tasks.save(task);
    }

    @Test
    void createsATodoWithPersonDeadlineAndTask() {
        MvcTestResult response = create("""
                { "text": "  Bremsscheiben bestellen ", "assigneeId": "%s", "dueDate": "2026-10-14", "taskId": "%s" }"""
                .formatted(reto.getId(), task.getId()));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.text").isEqualTo("Bremsscheiben bestellen");
        assertThat(response).bodyJson().extractingPath("$.assigneeId").isEqualTo(reto.getId().toString());
        assertThat(response).bodyJson().extractingPath("$.shopping").isEqualTo(false);
        // the task by reference – with what is needed to name it (bug #14: the old app copied the number text)
        assertThat(response).bodyJson().extractingPath("$.task.customerName").isEqualTo("Huber Test");
        assertThat(response).bodyJson().extractingPath("$.task.taskNumber").isEqualTo("A-17");
        assertThat(response).bodyJson().extractingPath("$.doneAt").isNull();
        assertThat(response).bodyJson().extractingPath("$.createdBy").isEqualTo(chef);
    }

    @Test
    void textIsRequiredAndThePersonMustBeSelectableForTodos() {
        Employee notForTodos = employees.save(new Employee(new EmployeeDetails("Lehrling", Role.MECHANIC, "#cccccc", null, 25,
                true, false, true), 2));
        Employee left = employees.save(EmployeeTestData.employee("Weg", 3));
        left.deactivate();
        employees.save(left);

        assertFieldError(create("{ \"text\": \" \" }"), "text");
        assertFieldError(create("{ \"text\": \"x\", \"assigneeId\": \"%s\" }".formatted(notForTodos.getId())), "assigneeId");
        assertFieldError(create("{ \"text\": \"x\", \"assigneeId\": \"%s\" }".formatted(left.getId())), "assigneeId");
        assertFieldError(create("{ \"text\": \"x\", \"taskId\": \"0199ffff-0000-7000-8000-000000000000\" }"), "taskId");
    }

    @Test
    void openOnesByDeadlineWithoutDeadlineLastAndFilters() {
        create("{ \"text\": \"ohne Frist\" }");
        create("{ \"text\": \"später\", \"dueDate\": \"2026-10-20\", \"assigneeId\": \"%s\" }".formatted(reto.getId()));
        create("{ \"text\": \"Kaffee\", \"dueDate\": \"2026-10-10\", \"shopping\": true }");
        create("{ \"text\": \"zum Auftrag\", \"dueDate\": \"2026-10-12\", \"taskId\": \"%s\" }".formatted(task.getId()));

        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$[*].text").asArray()
                .containsExactly("Kaffee", "zum Auftrag", "später", "ohne Frist");
        assertThat(mvc.get().uri("/api/todos?assigneeId=" + reto.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("später");
        assertThat(mvc.get().uri("/api/todos?unassigned=true").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Kaffee", "zum Auftrag", "ohne Frist");
        assertThat(mvc.get().uri("/api/todos?shopping=true").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Kaffee");
        assertThat(mvc.get().uri("/api/todos?shopping=false").exchange()).bodyJson().extractingPath("$").asArray().hasSize(3);
        assertThat(mvc.get().uri("/api/todos?taskId=" + task.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("zum Auftrag");
    }

    @Test
    void tickingOffRemembersWhoAndCanBeUndoneWithoutVersion() {
        String id = idOf(create("{ \"text\": \"Kunde anrufen\" }"));
        // someone else edited meanwhile – ticking off must still work
        send("PUT", "/api/todos/" + id, "{ \"text\": \"Kunde Huber anrufen\", \"version\": 0 }");

        MvcTestResult done = send("PUT", "/api/todos/" + id + "/done", "{ \"done\": true }");

        assertThat(done).hasStatusOk();
        assertThat(done).bodyJson().extractingPath("$.doneAt").isNotNull();
        assertThat(done).bodyJson().extractingPath("$.doneBy").isEqualTo(chef);
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/todos?done=true").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Kunde Huber anrufen");

        MvcTestResult undone = send("PUT", "/api/todos/" + id + "/done", "{ \"done\": false }");
        assertThat(undone).bodyJson().extractingPath("$.doneAt").isNull();
        assertThat(undone).bodyJson().extractingPath("$.doneBy").isNull();
    }

    @Test
    void draggingGivesItToSomeoneElseWithoutVersion() {
        String id = idOf(create("{ \"text\": \"Kunde anrufen\", \"assigneeId\": \"%s\" }".formatted(reto.getId())));
        send("PUT", "/api/todos/" + id, "{ \"text\": \"Kunde Huber anrufen\", \"assigneeId\": \"%s\", \"version\": 0 }".formatted(reto.getId()));
        Employee mora = employees.save(EmployeeTestData.employee("Mora", 4));

        assertThat(send("PUT", "/api/todos/" + id + "/assignee", "{ \"assigneeId\": \"%s\" }".formatted(mora.getId())))
                .bodyJson().extractingPath("$.assigneeId").isEqualTo(mora.getId().toString());
        assertThat(send("PUT", "/api/todos/" + id + "/assignee", "{ \"assigneeId\": null }"))
                .bodyJson().extractingPath("$.assigneeId").isNull();
        Employee notForTodos = employees.save(new Employee(new EmployeeDetails("Lehrling", Role.MECHANIC, "#cccccc", null, 25,
                true, false, true), 5));
        assertFieldError(send("PUT", "/api/todos/" + id + "/assignee", "{ \"assigneeId\": \"%s\" }".formatted(notForTodos.getId())),
                "assigneeId");
    }

    @Test
    void editingNeedsTheCurrentVersion() {
        String id = idOf(create("{ \"text\": \"A\" }"));

        assertFieldError(send("PUT", "/api/todos/" + id, "{ \"text\": \"B\" }"), "version");
        assertThat(send("PUT", "/api/todos/" + id, "{ \"text\": \"B\", \"version\": 0 }")).hasStatusOk();
        assertThat(send("PUT", "/api/todos/" + id, "{ \"text\": \"C\", \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void aDeletedTaskLeavesItsTodosWithoutLink() {
        String id = idOf(create("{ \"text\": \"Teile zurückschicken\", \"taskId\": \"%s\" }".formatted(task.getId())));

        assertThat(mvc.delete().uri("/api/tasks/" + task.getId()).header(CurrentPerson.HEADER, chef).exchange())
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$[0].id").isEqualTo(id);
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$[0].task").isNull();
    }

    @Test
    void deletesTodo() {
        String id = idOf(create("{ \"text\": \"weg damit\" }"));

        assertThat(mvc.delete().uri("/api/todos/" + id).header(CurrentPerson.HEADER, chef).exchange()).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String json) {
        return send("POST", "/api/todos", json);
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
