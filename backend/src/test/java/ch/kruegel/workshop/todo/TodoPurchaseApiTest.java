package ch.kruegel.workshop.todo;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
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

import static org.assertj.core.api.Assertions.assertThat;

/** Shopping list entries with an article in stock and a supplier (13g). Fictitious data only. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class TodoPurchaseApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;
    private String supplier;
    private String article;

    @BeforeEach
    void startWithAnArticleAndASupplier() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        supplier = idOf(send("POST", "/api/suppliers", "{ \"name\": \"Muster Teile AG\" }"));
        article = idOf(send("POST", "/api/stock-items", "{ \"name\": \"Ölfilter\", \"category\": \"SPARE_PART\" }"));
    }

    @Test
    void anEntryNamesTheArticleAndWhereToOrderIt() {
        MvcTestResult response = shoppingEntry(true);

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.stockItemId").isEqualTo(article);
        assertThat(response).bodyJson().extractingPath("$.supplierId").isEqualTo(supplier);
    }

    @Test
    void onlyOnTheShoppingList() {
        MvcTestResult response = shoppingEntry(false);

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.stockItemId").isNull();
        assertThat(response).bodyJson().extractingPath("$.supplierId").isNull();
    }

    @Test
    void anUnknownSupplierIsAFieldError() {
        MvcTestResult response = send("POST", "/api/todos",
                "{ \"text\": \"Ölfilter\", \"shopping\": true, \"supplierId\": \"01a00000-0000-7000-8000-000000000000\" }");

        assertThat(response).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(response).bodyJson().extractingPath("$.errors[0].field").isEqualTo("supplierId");
    }

    @Test
    void aDeletedSupplierOrArticleLeavesTheEntry() {
        String entry = idOf(shoppingEntry(true));

        send("DELETE", "/api/suppliers/" + supplier, null);
        send("DELETE", "/api/stock-items/" + article, null);

        assertThat(mvc.get().uri("/api/todos?shopping=true")).bodyJson().extractingPath("$[0].id").isEqualTo(entry);
        assertThat(mvc.get().uri("/api/todos?shopping=true")).bodyJson().extractingPath("$[0].supplierId").isNull();
        assertThat(mvc.get().uri("/api/todos?shopping=true")).bodyJson().extractingPath("$[0].stockItemId").isNull();
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).contains("todos");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult shoppingEntry(boolean shopping) {
        return send("POST", "/api/todos", """
                { "text": "2× Ölfilter", "shopping": %s, "stockItemId": "%s", "supplierId": "%s" }"""
                .formatted(shopping, article, supplier));
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "DELETE" -> mvc.delete().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        request = request.header(CurrentPerson.HEADER, chef);
        if (json != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return request.exchange();
    }

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
