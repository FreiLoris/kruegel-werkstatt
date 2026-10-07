package ch.kruegel.workshop.note;

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

/** Note API from the outside. Changes are made as person "Chef". Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class NoteApiTest {

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
    private Employee erich;
    private Task task;

    @BeforeEach
    void startWithPeopleAndATask() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        erich = employees.save(EmployeeTestData.employee("Erich", 2));
        reto = employees.save(EmployeeTestData.employee("Reto", 1));
        Customer huber = customers.save(CustomerTestData.local("Huber"));
        task = tasks.save(new Task(new TaskDetails(huber, null, Appointment.at(LocalDate.of(2026, 10, 15), LocalTime.of(8, 0)),
                null, null, TaskWork.described(null), null)));
    }

    @Test
    void createsANoteForSeveralPeopleAboutATask() {
        MvcTestResult response = create("""
                { "text": " Kunde will Offerte für Bremsen ", "info": "ruft um 14 Uhr an",
                  "assigneeIds": ["%s", "%s"], "taskId": "%s" }""".formatted(erich.getId(), reto.getId(), task.getId()));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.text").isEqualTo("Kunde will Offerte für Bremsen");
        // in the order of the employee list, not of the request
        assertThat(response).bodyJson().extractingPath("$.assigneeIds").asArray()
                .containsExactly(reto.getId().toString(), erich.getId().toString());
        // the task by reference (F8: the old modal showed "kein Auftrag" although it had one)
        assertThat(response).bodyJson().extractingPath("$.task.customerName").isEqualTo("Huber Test");
        assertThat(response).bodyJson().extractingPath("$.createdBy").isEqualTo(chef);
        assertThat(response).bodyJson().extractingPath("$.todoCount").isEqualTo(0);
    }

    @Test
    void textIsRequiredAndPeopleMustBeSelectable() {
        Employee notForNotes = employees.save(new Employee(new EmployeeDetails("Lehrling", Role.MECHANIC, "#cccccc", null, 25,
                true, false, true), 3));

        assertFieldError(create("{ \"text\": \" \" }"), "text");
        assertFieldError(create("{ \"text\": \"x\", \"assigneeIds\": [\"%s\"] }".formatted(notForNotes.getId())), "assigneeIds");
        assertFieldError(create("{ \"text\": \"x\", \"taskId\": \"0199ffff-0000-7000-8000-000000000000\" }"), "taskId");
    }

    @Test
    void theBoardIsNewestFirstAndFiltersByPersonNobodyAndTask() {
        create("{ \"text\": \"für beide\", \"assigneeIds\": [\"%s\", \"%s\"] }".formatted(reto.getId(), erich.getId()));
        create("{ \"text\": \"für niemand\" }");
        create("{ \"text\": \"zum Auftrag\", \"assigneeIds\": [\"%s\"], \"taskId\": \"%s\" }".formatted(erich.getId(), task.getId()));

        assertThat(mvc.get().uri("/api/notes").exchange()).bodyJson().extractingPath("$[*].text").asArray()
                .containsExactly("zum Auftrag", "für niemand", "für beide");
        assertThat(mvc.get().uri("/api/notes?assigneeId=" + reto.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("für beide");
        assertThat(mvc.get().uri("/api/notes?assigneeId=" + erich.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("zum Auftrag", "für beide");
        assertThat(mvc.get().uri("/api/notes?unassigned=true").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("für niemand");
        assertThat(mvc.get().uri("/api/notes?taskId=" + task.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("zum Auftrag");
    }

    @Test
    void subTasksAreOrdinaryTodos() {
        String note = idOf(create("{ \"text\": \"Grosser Service vorbereiten\" }"));

        MvcTestResult todo = send("POST", "/api/notes/" + note + "/todos",
                "{ \"text\": \"Öl bestellen\", \"assigneeId\": \"%s\", \"taskId\": \"%s\" }".formatted(reto.getId(), task.getId()));

        assertThat(todo).hasStatus(HttpStatus.CREATED);
        assertThat(todo).bodyJson().extractingPath("$.noteId").isEqualTo(note);
        // the note has the task, the sub-task does not get its own
        assertThat(todo).bodyJson().extractingPath("$.task").isNull();
        // one list (bug #10): the sub-task is in the to-do list of Reto too
        assertThat(mvc.get().uri("/api/todos?assigneeId=" + reto.getId()).exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Öl bestellen");
        assertThat(mvc.get().uri("/api/todos?noteId=" + note).exchange()).bodyJson().extractingPath("$").asArray().hasSize(1);
        assertThat(mvc.get().uri("/api/notes/" + note).exchange()).bodyJson().extractingPath("$.todoCount").isEqualTo(1);
    }

    @Test
    void archivingTicksOffTheOpenSubTasksReactivatingReopensExactlyThose() {
        String note = idOf(create("{ \"text\": \"Grosser Service vorbereiten\" }"));
        String doneBefore = idOf(send("POST", "/api/notes/" + note + "/todos", "{ \"text\": \"Termin bestätigen\" }"));
        send("POST", "/api/notes/" + note + "/todos", "{ \"text\": \"Öl bestellen\" }");
        send("PUT", "/api/todos/" + doneBefore + "/done", "{ \"done\": true }");

        MvcTestResult archived = send("PUT", "/api/notes/" + note + "/archived", "{ \"archived\": true }");

        assertThat(archived).bodyJson().extractingPath("$.archivedAt").isNotNull();
        assertThat(archived).bodyJson().extractingPath("$.todoDoneCount").isEqualTo(2);
        assertThat(mvc.get().uri("/api/notes").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        // an archived note takes no new sub-tasks
        assertThat(send("POST", "/api/notes/" + note + "/todos", "{ \"text\": \"noch was\" }")).hasStatus(HttpStatus.CONFLICT);

        MvcTestResult back = send("PUT", "/api/notes/" + note + "/archived", "{ \"archived\": false }");

        assertThat(back).bodyJson().extractingPath("$.archivedAt").isNull();
        // the one ticked off by archiving is open again, the one done before stays done
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$[*].text").asArray().containsExactly("Öl bestellen");
        assertThat(back).bodyJson().extractingPath("$.todoDoneCount").isEqualTo(1);
    }

    @Test
    void theArchiveIsSearchable() {
        String brakes = idOf(create("{ \"text\": \"Bremsen Huber\", \"info\": \"100% erledigt\" }"));
        String oil = idOf(create("{ \"text\": \"Öl bestellen\" }"));
        send("PUT", "/api/notes/" + brakes + "/archived", "{ \"archived\": true }");
        send("PUT", "/api/notes/" + oil + "/archived", "{ \"archived\": true }");

        assertThat(mvc.get().uri("/api/notes?archived=true").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Öl bestellen", "Bremsen Huber");
        assertThat(mvc.get().uri("/api/notes?archived=true&q=BREMS").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Bremsen Huber");
        // % is a character, not "anything"
        assertThat(mvc.get().uri("/api/notes").param("archived", "true").param("q", "100%").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Bremsen Huber");
        assertThat(mvc.get().uri("/api/notes").param("archived", "true").param("q", "%").exchange())
                .bodyJson().extractingPath("$[*].text").asArray().containsExactly("Bremsen Huber");
    }

    @Test
    void editingNeedsTheCurrentVersionAndKeepsAPersonWhoLeft() {
        String note = idOf(create("{ \"text\": \"A\", \"assigneeIds\": [\"%s\"] }".formatted(reto.getId())));
        reto.deactivate();
        employees.save(reto);

        assertFieldError(send("PUT", "/api/notes/" + note, "{ \"text\": \"B\" }"), "version");
        assertThat(send("PUT", "/api/notes/" + note, "{ \"text\": \"B\", \"assigneeIds\": [\"%s\"], \"version\": 0 }".formatted(reto.getId())))
                .hasStatusOk();
        assertThat(send("PUT", "/api/notes/" + note, "{ \"text\": \"C\", \"version\": 0 }")).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void deletingANoteDeletesItsSubTasksADeletedTaskLeavesTheNote() {
        String withTask = idOf(create("{ \"text\": \"zum Auftrag\", \"taskId\": \"%s\" }".formatted(task.getId())));
        String other = idOf(create("{ \"text\": \"weg damit\" }"));
        send("POST", "/api/notes/" + other + "/todos", "{ \"text\": \"Unteraufgabe\" }");

        assertThat(mvc.delete().uri("/api/notes/" + other).header(CurrentPerson.HEADER, chef).exchange()).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/todos").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();

        assertThat(mvc.delete().uri("/api/tasks/" + task.getId()).header(CurrentPerson.HEADER, chef).exchange()).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.get().uri("/api/notes/" + withTask).exchange()).bodyJson().extractingPath("$.task").isNull();
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String json) {
        return send("POST", "/api/notes", json);
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
