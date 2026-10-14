package ch.kruegel.workshop.stock;

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

/** Stock list and storage locations from the outside (FB-08). Changes are made as person "Chef". */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class StockApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    // ── Storage locations ────────────────────────────────────────────

    @Test
    void storageLocationsKeepTheirOrderAndNamesAreUnique() {
        String a = idOf(send("POST", "/api/storage-locations", "{ \"name\": \"Regal A\" }"));
        String b = idOf(send("POST", "/api/storage-locations", "{ \"name\": \" Regal B \" }"));

        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"regal a\" }")).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send("PUT", "/api/storage-locations/order", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(b, a)))
                .bodyJson().extractingPath("$[*].name").asArray().containsExactly("Regal B", "Regal A");
    }

    @Test
    void aStorageLocationNoLongerUsedCannotBeChosenButStaysOnItsArticles() {
        String shelf = idOf(send("POST", "/api/storage-locations", "{ \"name\": \"Regal A\" }"));
        String item = idOf(createItem("Bremsflüssigkeit", "CONSUMABLE", shelf));
        send("POST", "/api/storage-locations/" + shelf + "/deactivate", null);

        assertThat(createItem("Kühlmittel", "CONSUMABLE", shelf)).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("storageLocationId");
        // editing the old article keeps its shelf
        MvcTestResult edited = send("PUT", "/api/stock-items/" + item, """
                { "name": "Bremsflüssigkeit DOT 4", "category": "CONSUMABLE", "storageLocationId": "%s", "version": 0 }"""
                .formatted(shelf));
        assertThat(edited).hasStatus(HttpStatus.OK);
        assertThat(edited).bodyJson().extractingPath("$.storageLocationId").isEqualTo(shelf);
    }

    // ── Stock list ───────────────────────────────────────────────────

    @Test
    void createsAnArticleWithAllFields() {
        String shelf = idOf(send("POST", "/api/storage-locations", "{ \"name\": \"Regal A\" }"));

        MvcTestResult response = send("POST", "/api/stock-items", """
                { "name": "  Ölfilter ", "category": "SPARE_PART", "articleNumber": "OF-123", "manufacturer": " ",
                  "quantity": 4, "storageLocationId": "%s", "remark": "für VW" }""".formatted(shelf));

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Ölfilter");
        assertThat(response).bodyJson().extractingPath("$.manufacturer").isNull();
        assertThat(response).bodyJson().extractingPath("$.quantity").isEqualTo(4);
        assertThat(response).bodyJson().extractingPath("$.updatedBy").isEqualTo(chef);
    }

    @Test
    void listIsSortedByNameIgnoringCase() {
        createItem("zange", "TOOL", null);
        createItem("Bremsreiniger", "CONSUMABLE", null);
        createItem("Luftfilter", "SPARE_PART", null);

        assertThat(mvc.get().uri("/api/stock-items")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactly("Bremsreiniger", "Luftfilter", "zange");
    }

    @Test
    void negativeQuantityAndMissingCategoryAreFieldErrors() {
        assertThat(send("POST", "/api/stock-items", "{ \"name\": \"Ölfilter\", \"category\": \"SPARE_PART\", \"quantity\": -1 }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("quantity");
        assertThat(send("POST", "/api/stock-items", "{ \"name\": \"Ölfilter\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("category");
    }

    @Test
    void editNeedsTheCurrentVersion() {
        String id = idOf(createItem("Ölfilter", "SPARE_PART", null));
        String edit = "{ \"name\": \"Ölfilter gross\", \"category\": \"SPARE_PART\", \"quantity\": 2, \"version\": 0 }";

        assertThat(send("PUT", "/api/stock-items/" + id, edit)).hasStatus(HttpStatus.OK);
        assertThat(send("PUT", "/api/stock-items/" + id, edit)).hasStatus(HttpStatus.CONFLICT);
    }

    @Test
    void deletes() {
        String id = idOf(createItem("Ölfilter", "SPARE_PART", null));

        assertThat(send("DELETE", "/api/stock-items/" + id, null)).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(mvc.get().uri("/api/stock-items")).bodyJson().extractingPath("$").asArray().isEmpty();
        assertThat(send("DELETE", "/api/stock-items/" + id, null)).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void changesAreAnnouncedAsLiveUpdate() {
        send("POST", "/api/storage-locations", "{ \"name\": \"Regal A\" }");
        createItem("Ölfilter", "SPARE_PART", null);

        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic)
                .containsExactly("storage-locations", "stock-items");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult createItem(String name, String category, String storageLocationId) {
        String location = storageLocationId == null ? "null" : "\"" + storageLocationId + "\"";
        return send("POST", "/api/stock-items", "{ \"name\": \"%s\", \"category\": \"%s\", \"storageLocationId\": %s }"
                .formatted(name, category, location));
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

    private static String idOf(MvcTestResult response) {
        try {
            return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
