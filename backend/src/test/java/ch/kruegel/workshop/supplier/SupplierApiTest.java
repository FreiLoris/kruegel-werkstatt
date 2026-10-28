package ch.kruegel.workshop.supplier;

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

/** Suppliers and their link to the stock list from the outside (FB-09). Fictitious companies only. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(TestcontainersConfiguration.class)
class SupplierApiTest {

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

    @Test
    void createsASupplierWithAllFields() {
        MvcTestResult response = send("POST", "/api/suppliers", """
                { "name": " Muster Teile AG ", "phone": "044 000 00 00",
                  "email": "bestellung@example.ch", "webshopUrl": "shop.example.ch", "customerNumber": "K-42",
                  "orderChannel": "WEBSHOP", "delivery": "2× täglich", "remark": " " }""");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.name").isEqualTo("Muster Teile AG");
        // typed without https:// – added, so the link works
        assertThat(response).bodyJson().extractingPath("$.webshopUrl").isEqualTo("https://shop.example.ch");
        assertThat(response).bodyJson().extractingPath("$.remark").isNull();
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).containsExactly("suppliers");
    }

    @Test
    void severalContactsAndWaysOfDeliveryInTheirOrder() {
        // FB-30: departments with direct line and mobile; tours with order deadline and arrival
        MvcTestResult response = send("POST", "/api/suppliers", """
                { "name": "Muster Teile AG", "phone": "044 000 00 00",
                  "contacts": [
                    { "department": "Verkauf Innendienst", "name": "Frau Beispiel", "phone": "044 000 00 01", "email": "vi@example.ch" },
                    { "department": "Reifen", "mobile": "079 000 00 02" } ],
                  "deliveries": [
                    { "kind": "Tagesexpress", "orderDeadline": "09:30", "tour": "Tour 1", "arrival": "11:00", "postage": 0 },
                    { "kind": "Nachtexpress", "orderDeadline": "17:00", "arrival": "07:30", "arrivalNextDay": true,
                      "postage": 12.50, "remark": "ab CHF 100 gratis" } ] }""");

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.contacts[*].department").asArray().containsExactly("Verkauf Innendienst", "Reifen");
        assertThat(response).bodyJson().extractingPath("$.contacts[1].name").isNull();
        assertThat(response).bodyJson().extractingPath("$.deliveries[0].orderDeadline").isEqualTo("09:30:00");
        assertThat(response).bodyJson().extractingPath("$.deliveries[1].arrivalNextDay").isEqualTo(true);
        assertThat(response).bodyJson().extractingPath("$.deliveries[1].postage").isEqualTo(12.5);

        // edited together with the supplier: replaced as a whole, in the new order
        MvcTestResult changed = send("PUT", "/api/suppliers/" + idOf(response), """
                { "name": "Muster Teile AG", "version": 0,
                  "contacts": [ { "department": "Reifen", "mobile": "079 000 00 02" } ],
                  "deliveries": [] }""");
        assertThat(changed).bodyJson().extractingPath("$.contacts.length()").isEqualTo(1);
        assertThat(changed).bodyJson().extractingPath("$.deliveries").asArray().isEmpty();
    }

    @Test
    void anEmptyContactOrADeliveryWithoutKindIsAFieldError() {
        assertThat(send("POST", "/api/suppliers", """
                { "name": "Muster Teile AG", "contacts": [ { "department": " ", "remark": "nur Bemerkung" } ] }"""))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("contacts[0]");
        assertThat(send("POST", "/api/suppliers", """
                { "name": "Muster Teile AG", "deliveries": [ { "kind": "", "tour": "Tour 1" } ] }"""))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void refusesOtherLinksAWrongEmailAndATakenName() {
        create("Muster Teile AG");

        assertThat(send("POST", "/api/suppliers", "{ \"name\": \"A\", \"webshopUrl\": \"javascript:alert(1)\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("webshopUrl");
        assertThat(send("POST", "/api/suppliers", "{ \"name\": \"A\", \"email\": \"kein-mail\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("email");
        assertThat(send("POST", "/api/suppliers", "{ \"name\": \"muster teile ag\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
    }

    @Test
    void aLinkTooLongWithHttpsIsAFieldErrorABlankLinkIsNone() {
        // allowed as typed, but "https://" in front makes it longer than the column
        String longLink = "shop.example.ch/" + "a".repeat(Supplier.URL_MAX - 16);

        assertThat(send("POST", "/api/suppliers", "{ \"name\": \"A\", \"webshopUrl\": \"%s\" }".formatted(longLink)))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("webshopUrl");
        assertThat(send("POST", "/api/suppliers", "{ \"name\": \"B\", \"webshopUrl\": \"   \" }"))
                .hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.webshopUrl").isNull();
    }

    @Test
    void anArticleHasAMainSupplierAndFurtherOnesWithTheirNumbers() {
        String main = idOf(create("Muster Teile AG"));
        String other = idOf(create("Beispiel Handel GmbH"));

        MvcTestResult response = createArticle(main, other);

        assertThat(response).hasStatus(HttpStatus.CREATED);
        assertThat(response).bodyJson().extractingPath("$.suppliers[*].supplierId").asArray().containsExactly(main, other);
        assertThat(response).bodyJson().extractingPath("$.suppliers[0].articleNumber").isEqualTo("MT-1");
        assertThat(response).bodyJson().extractingPath("$.suppliers[1].articleNumber").isNull();
    }

    @Test
    void theOrderOfTheSuppliersCanBeSwapped() {
        String main = idOf(create("Muster Teile AG"));
        String other = idOf(create("Beispiel Handel GmbH"));
        String article = idOf(createArticle(main, other));

        MvcTestResult response = send("PUT", "/api/stock-items/" + article, """
                { "name": "Ölfilter", "category": "SPARE_PART", "version": 0,
                  "suppliers": [ { "supplierId": "%s" }, { "supplierId": "%s", "articleNumber": "MT-1" } ] }"""
                .formatted(other, main));

        assertThat(response).hasStatus(HttpStatus.OK);
        assertThat(response).bodyJson().extractingPath("$.suppliers[*].supplierId").asArray().containsExactly(other, main);
    }

    @Test
    void aSupplierOnlyOncePerArticle() {
        String main = idOf(create("Muster Teile AG"));

        assertThat(createArticle(main, main)).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[0].field").isEqualTo("suppliers");
    }

    @Test
    void deletingASupplierTakesItOffItsArticles() {
        String main = idOf(create("Muster Teile AG"));
        String other = idOf(create("Beispiel Handel GmbH"));
        createArticle(main, other);

        assertThat(send("DELETE", "/api/suppliers/" + main, null)).hasStatus(HttpStatus.NO_CONTENT);

        // the further one becomes the main supplier
        assertThat(mvc.get().uri("/api/stock-items")).bodyJson().extractingPath("$[0].suppliers[*].supplierId").asArray()
                .containsExactly(other);
        assertThat(events.stream(DataChanged.class)).extracting(DataChanged::topic).contains("suppliers", "stock-items");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private MvcTestResult create(String name) {
        return send("POST", "/api/suppliers", "{ \"name\": \"%s\" }".formatted(name));
    }

    private MvcTestResult createArticle(String main, String other) {
        return send("POST", "/api/stock-items", """
                { "name": "Ölfilter", "category": "SPARE_PART",
                  "suppliers": [ { "supplierId": "%s", "articleNumber": " MT-1 " }, { "supplierId": "%s" } ] }"""
                .formatted(main, other));
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
