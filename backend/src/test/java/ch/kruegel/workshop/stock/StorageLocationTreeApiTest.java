package ch.kruegel.workshop.stock;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;

import static org.assertj.core.api.Assertions.assertThat;

/** Storage locations as a tree (13f): floor or room › shelf › drawer. Fictitious places only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class StorageLocationTreeApiTest {

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void startWithChef() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
    }

    @Test
    void placesNestAsDeepAsNeeded() {
        String office = create("Büro", null);
        String shelf = create("Regal 2", office);

        MvcTestResult drawer = send("POST", "/api/storage-locations", "{ \"name\": \"Schublade 3\", \"parentId\": \"%s\" }".formatted(shelf));

        assertThat(drawer).hasStatus(HttpStatus.CREATED);
        assertThat(drawer).bodyJson().extractingPath("$.parentId").isEqualTo(shelf);
    }

    @Test
    void aNameOnlyOncePerLevel() {
        String ground = create("EG", null);
        String first = create("1. OG", null);
        create("Lager", ground);

        // the same name on another floor is fine, twice on the same one is not
        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"Lager\", \"parentId\": \"%s\" }".formatted(first)))
                .hasStatus(HttpStatus.CREATED);
        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"lager\", \"parentId\": \"%s\" }".formatted(ground)))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"eg\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void movesWithEverythingInsideButNotIntoItself() {
        String office = create("Büro", null);
        String cellar = create("Keller", null);
        String shelf = create("Regal 2", office);
        String drawer = create("Schublade 3", shelf);

        assertThat(move(shelf, drawer)).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("parentId");
        assertThat(move(shelf, shelf)).hasStatus(HttpStatus.BAD_REQUEST);

        assertThat(move(shelf, cellar)).hasStatus(HttpStatus.OK).bodyJson().extractingPath("$.parentId").isEqualTo(cellar);
        // the drawer stays in its shelf – and is in the cellar now with it
        assertThat(mvc.get().uri("/api/storage-locations")).bodyJson()
                .extractingPath("$[?(@.name == 'Schublade 3')].parentId").asArray().containsExactly(shelf);
        // to the top level
        assertThat(move(shelf, null)).hasStatus(HttpStatus.OK).bodyJson().extractingPath("$.parentId").isNull();
    }

    @Test
    void noLongerUsedWithEverythingInsideAndBackAgain() {
        String office = create("Büro", null);
        String shelf = create("Regal 2", office);
        create("Schublade 3", shelf);

        send("POST", "/api/storage-locations/" + office + "/deactivate", null);

        assertThat(mvc.get().uri("/api/storage-locations")).bodyJson().extractingPath("$").asArray().isEmpty();
        // nothing new inside a place no longer used, and the drawer only comes back with its room
        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"Regal 3\", \"parentId\": \"%s\" }".formatted(office)))
                .hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(send("POST", "/api/storage-locations/" + shelf + "/activate", null)).hasStatus(HttpStatus.BAD_REQUEST);

        send("POST", "/api/storage-locations/" + office + "/activate", null);
        assertThat(mvc.get().uri("/api/storage-locations")).bodyJson().extractingPath("$[*].name").asArray()
                .containsExactlyInAnyOrder("Büro", "Regal 2", "Schublade 3");
    }

    @Test
    void usingAShelfAgainBringsBackOnlyWhatWasClearedOutWithIt() {
        String shelf = create("Regal 2", null);
        String oldDrawer = create("Schublade 1", shelf);
        send("POST", "/api/storage-locations/" + oldDrawer + "/deactivate", null);
        String newDrawer = create("Schublade 1", shelf);
        send("POST", "/api/storage-locations/" + shelf + "/deactivate", null);

        assertThat(send("POST", "/api/storage-locations/" + shelf + "/activate", null)).hasStatus(HttpStatus.OK);

        // the drawer cleared out on its own before stays out – no second "Schublade 1"
        assertThat(mvc.get().uri("/api/storage-locations")).bodyJson().extractingPath("$[*].id").asArray()
                .containsExactlyInAnyOrder(shelf, newDrawer);
    }

    @Test
    void orderPerLevel() {
        String office = create("Büro", null);
        String a = create("Regal A", office);
        String b = create("Regal B", office);
        String cellar = create("Keller", null);

        assertThat(send("PUT", "/api/storage-locations/order", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(b, a))).hasStatus(HttpStatus.OK);
        assertThat(mvc.get().uri("/api/storage-locations")).bodyJson()
                .extractingPath("$[?(@.name == 'Regal B')].sortOrder").asArray().containsExactly(0);
        // only places of the same level
        assertThat(send("PUT", "/api/storage-locations/order", "{ \"ids\": [\"%s\", \"%s\"] }".formatted(a, cellar)))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    @Test
    void aCodeToWriteOnTheShelfOnceOnThePremises() {
        String cellar = create("Keller", null);
        MvcTestResult stairs = send("POST", "/api/storage-locations", "{ \"name\": \"Treppe\", \"parentId\": \"%s\", \"code\": \" ka01 \" }".formatted(cellar));
        assertThat(stairs).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.code").isEqualTo("KA01");
        // a place inside it may have none – it shows the one above
        String shelf = create("oberes Fach", idOf(stairs));
        assertThat(mvc.get().uri("/api/storage-locations").exchange()).bodyJson()
                .extractingPath("$[?(@.id == '%s')].code".formatted(shelf)).asArray().containsExactly((Object) null);

        // once on the premises – also when the other one is no longer in use
        MvcTestResult twice = send("POST", "/api/storage-locations", "{ \"name\": \"Haken\", \"parentId\": \"%s\", \"code\": \"KA01\" }".formatted(cellar));
        assertThat(twice).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("code");
        // AA00 only
        assertThat(send("POST", "/api/storage-locations", "{ \"name\": \"Haken\", \"code\": \"K1\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("code");

        // renamed it keeps its code – and an edit may take it away
        MvcTestResult renamed = send("PUT", "/api/storage-locations/" + idOf(stairs), "{ \"name\": \"Kellertreppe\", \"code\": \"KA01\", \"version\": 0 }");
        assertThat(renamed).hasStatusOk().bodyJson().extractingPath("$.code").isEqualTo("KA01");
        assertThat(send("PUT", "/api/storage-locations/" + idOf(stairs), "{ \"name\": \"Kellertreppe\", \"version\": 1 }"))
                .hasStatusOk().bodyJson().extractingPath("$.code").isNull();
    }

    private String create(String name, String parentId) {
        String parent = parentId == null ? "null" : "\"" + parentId + "\"";
        MvcTestResult response = send("POST", "/api/storage-locations", "{ \"name\": \"%s\", \"parentId\": %s }".formatted(name, parent));
        assertThat(response).hasStatus(HttpStatus.CREATED);
        return idOf(response);
    }

    private MvcTestResult move(String id, String parentId) {
        String parent = parentId == null ? "null" : "\"" + parentId + "\"";
        return send("PUT", "/api/storage-locations/" + id + "/parent", "{ \"parentId\": %s }".formatted(parent));
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
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
