package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.TestDatabase;
import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.person.CurrentPerson;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.EmployeeTestData;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import java.io.UnsupportedEncodingException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, ReminderApiTest.SmsConfig.class})
class ReminderApiTest {

    /** Thursday, 16:05 – the reminders for Friday go out */
    private static final LocalDateTime THURSDAY = LocalDateTime.of(2026, 12, 3, 16, 5);

    /** An SMS provider that keeps what it got – or fails */
    static class FakeSms implements ReminderSender {
        final List<String> sent = new ArrayList<>();
        boolean failing;

        @Override
        public ReminderChannel channel() {
            return ReminderChannel.SMS;
        }

        @Override
        public void send(ReminderContact to, ReminderMessage message) {
            if (failing) {
                throw new IllegalStateException("Kein Guthaben");
            }
            sent.add(to.recipient() + ": " + message.text());
        }
    }

    @TestConfiguration
    static class SmsConfig {
        @Bean
        FakeSms fakeSms() {
            return new FakeSms();
        }
    }

    @Autowired
    private MockMvcTester mvc;

    @Autowired
    private EmployeeRepository employees;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private ReminderService service;

    @Autowired
    private FakeSms sms;

    @Autowired
    private JdbcTemplate jdbc;

    private String chef;

    @BeforeEach
    void start() {
        TestDatabase.clear(jdbc);
        chef = employees.save(EmployeeTestData.employee("Chef", 0)).getId().toString();
        sms.sent.clear();
        sms.failing = false;
    }

    @Test
    void offUntilTurnedOnAndTellsWhatCanBeSent() {
        MvcTestResult settings = mvc.get().uri("/api/reminder-settings").exchange();
        assertThat(settings).bodyJson().extractingPath("$.enabled").isEqualTo(false);
        assertThat(settings).bodyJson().extractingPath("$.sendTime").isEqualTo("16:00:00");
        assertThat(settings).bodyJson().extractingPath("$.smsReady").isEqualTo(true);

        task(withMobile("079 123 45 67"), "2026-12-04", null);
        service.remindDue(THURSDAY);
        assertThat(sms.sent).isEmpty();

        assertThat(send("PUT", "/api/reminder-settings", "{ \"enabled\": true, \"sendTime\": \"07:00\", \"version\": 0 }"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void theDayBeforeBySmsElseSomeoneCalls() {
        turnOn();
        String bySms = task(withMobile("079 123 45 67"), "2026-12-04", null);
        String onlyEmail = task(customer("052 000 00 00", null, "huber@example.ch"), "2026-12-04", null);
        String noContact = task(customer("052 000 00 00", null, null), "2026-12-04", null);
        task(withMobile("079 999 99 99"), "2026-12-04", "\"remindCustomer\": false");
        task(withMobile("079 888 88 88"), "2026-12-07", null);

        service.remindDue(THURSDAY.withHour(15).withMinute(55));
        assertThat(sms.sent).isEmpty();

        service.remindDue(THURSDAY);
        assertThat(sms.sent).containsExactly("+41791234567: Guten Tag Herr Huber\n\nWir erinnern Sie an Ihren Termin:\nMorgen, Fr 4.12., 08:00 Uhr\n\nBei Verhinderung bitte melden:\n\nFreundliche Grüsse\nKrügel Fahrzeugtechnik");
        // no e-mail for now: to be called like one without any contact
        assertThat(outcomes()).containsExactlyInAnyOrderEntriesOf(Map.of(bySms, "SENT", onlyEmail, "NO_CONTACT", noContact, "NO_CONTACT"));

        // ten minutes later: nothing twice
        service.remindDue(THURSDAY.plusMinutes(10));
        assertThat(sms.sent).hasSize(1);
    }

    @Test
    void whatHappenedPerTaskAndWhomToCall() {
        turnOn();
        String bySms = task(withMobile("079 123 45 67"), "2026-12-04", null);
        String noContact = task(customer("052 000 00 00", null, null), "2026-12-04", null);
        String failing = task(withMobile("079 222 22 22"), "2026-12-07", null);
        service.remindDue(THURSDAY);
        sms.failing = true;
        service.remindDue(THURSDAY.plusDays(1));

        MvcTestResult ofTask = mvc.get().uri("/api/reminders?taskId=" + bySms).exchange();
        assertThat(ofTask).bodyJson().extractingPath("$[0].outcome").isEqualTo("SENT");
        assertThat(ofTask).bodyJson().extractingPath("$[0].dropOffDate").isEqualTo("2026-12-04");

        MvcTestResult friday = mvc.get().uri("/api/reminders/to-call?date=2026-12-04").exchange();
        assertThat(friday).bodyJson().extractingPath("$[*].taskId").asArray().containsExactly(noContact);
        assertThat(friday).bodyJson().extractingPath("$[0].phone").isEqualTo("052 000 00 00");
        assertThat(friday).bodyJson().extractingPath("$[0].outcome").isEqualTo("NO_CONTACT");

        MvcTestResult monday = mvc.get().uri("/api/reminders/to-call?date=2026-12-07").exchange();
        assertThat(monday).bodyJson().extractingPath("$[0].taskId").isEqualTo(failing);
        assertThat(monday).bodyJson().extractingPath("$[0].error").isEqualTo("Kein Guthaben");
    }


    @Test
    void theCallListAndTheTaskFollowTheTaskAsItIsNow() {
        turnOn();
        Customer huber = customer("052 000 00 00", null, null);
        String moved = task(huber, "2026-12-04", null);
        String done = task(customer("052 111 11 11", null, null), "2026-12-04", null);
        String arrived = task(customer("052 222 22 22", null, null), "2026-12-04", null);
        service.remindDue(THURSDAY);
        assertThat(mvc.get().uri("/api/reminders?taskId=" + moved).exchange()).bodyJson().extractingPath("$[0].outcome").isEqualTo("NO_CONTACT");

        assertThat(send("PUT", "/api/tasks/" + moved, taskBody(huber, "2026-12-11", "\"version\": 0"))).hasStatusOk();
        assertThat(send("PUT", "/api/tasks/" + done + "/status", "{ \"status\": \"DONE\" }")).hasStatusOk();
        assertThat(send("PUT", "/api/tasks/" + arrived + "/vehicle-location", "{ \"location\": \"AT_WORKSHOP\" }")).hasStatusOk();

        assertThat(mvc.get().uri("/api/reminders/to-call?date=2026-12-04").exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
        // moved: the old day's reminder is not this appointment's
        assertThat(mvc.get().uri("/api/reminders?taskId=" + moved).exchange()).bodyJson().extractingPath("$").asArray().isEmpty();
    }
    @Test
    void onFridayAlsoForMondayButNotAtNight() {
        turnOn();
        task(withMobile("079 123 45 67"), "2026-12-07", null);
        service.remindDue(LocalDateTime.of(2026, 12, 4, 20, 0));
        assertThat(sms.sent).isEmpty();
        service.remindDue(LocalDateTime.of(2026, 12, 4, 16, 0));
        assertThat(sms.sent).singleElement().asString().contains("Mo 7.12., 08:00 Uhr");
    }

    @Test
    void notWhenTheCustomerWantsNoneOrTheCarIsHere() {
        turnOn();
        Customer huber = withMobile("079 123 45 67");
        task(huber, "2026-12-04", null);
        task(withMobile("079 222 22 22"), "2026-12-04", "\"vehicleLocation\": \"AT_WORKSHOP\"");

        MvcTestResult none = send("PUT", "/api/customers/" + huber.getId() + "/no-reminders", "{ \"noReminders\": true }");
        assertThat(none).hasStatusOk().bodyJson().extractingPath("$.noReminders").isEqualTo(true);
        assertThat(none).bodyJson().extractingPath("$.reminderChannel").isEqualTo("SMS");

        service.remindDue(THURSDAY);
        assertThat(sms.sent).isEmpty();
    }

    @Test
    void aFailureIsKeptForSomeoneToCall() {
        turnOn();
        String task = task(withMobile("079 123 45 67"), "2026-12-04", null);
        sms.failing = true;
        service.remindDue(THURSDAY);
        assertThat(outcomes()).containsExactlyEntriesOf(Map.of(task, "FAILED"));
        assertThat(jdbc.queryForObject("SELECT error FROM task_reminder", String.class)).isEqualTo("Kein Guthaben");
    }

    @Test
    void ticked_unlessTakenOff_andKeptWhenEditedWithoutIt() throws UnsupportedEncodingException {
        Customer huber = withMobile("079 123 45 67");
        MvcTestResult created = send("POST", "/api/tasks", taskBody(huber, "2026-12-04", null));
        assertThat(created).bodyJson().extractingPath("$.remindCustomer").isEqualTo(true);
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        assertThat(send("PUT", "/api/tasks/" + id, taskBody(huber, "2026-12-04", "\"remindCustomer\": false, \"version\": 0")))
                .bodyJson().extractingPath("$.remindCustomer").isEqualTo(false);
        assertThat(send("PUT", "/api/tasks/" + id, taskBody(huber, "2026-12-04", "\"version\": 1")))
                .bodyJson().extractingPath("$.remindCustomer").isEqualTo(false);
    }

    @Test
    void aCarThatComesEarlierIsRemindedForThatDay_evenLongBefore() {
        turnOn();
        task(withMobile("079 123 45 67"), "2026-12-21", "\"arrivesEarlier\": \"2026-12-04T17:00\"");
        service.remindDue(THURSDAY);
        assertThat(sms.sent).singleElement().asString()
                .contains("Morgen, Fr 4.12., 17:00 Uhr (bitte Fahrzeug bringen)");
    }

    @Test
    void anOpenTimeIsNotNamed() {
        turnOn();
        task(withMobile("079 123 45 67"), "2026-12-04", "\"timeOpen\": true");
        service.remindDue(THURSDAY);
        assertThat(sms.sent).singleElement().asString().contains("Ihren Termin:\nMorgen, Fr 4.12.\n\nBei Verhinderung");
    }

    @Test
    void waitingForPartsYes_doneNo_takenTodayNo() {
        turnOn();
        String waiting = task(withMobile("079 111 11 11"), "2026-12-04", null);
        String done = task(withMobile("079 222 22 22"), "2026-12-04", null);
        String today = task(withMobile("079 333 33 33"), "2026-12-04", null);
        assertThat(send("PUT", "/api/tasks/" + waiting + "/status", "{ \"status\": \"WAITING_FOR_PARTS\" }")).hasStatusOk();
        assertThat(send("PUT", "/api/tasks/" + done + "/status", "{ \"status\": \"DONE\" }")).hasStatusOk();
        jdbc.update("UPDATE task SET created_at = '2026-12-03T09:00:00+01' WHERE id = ?::uuid", today);

        service.remindDue(THURSDAY);
        assertThat(outcomes()).containsOnlyKeys(waiting);
    }

    @Test
    void beforeAHolidayAlsoForTheDayAfter() {
        turnOn();
        // Ascension 2027 is Thursday, 6 May: on Wednesday the reminders for Friday go out too
        task(withMobile("079 123 45 67"), "2027-05-07", null);
        service.remindDue(LocalDateTime.of(2027, 5, 6, 16, 5));
        assertThat(sms.sent).isEmpty();
        service.remindDue(LocalDateTime.of(2027, 5, 5, 16, 5));
        assertThat(sms.sent).singleElement().asString().contains("Fr 7.5., 08:00 Uhr");
    }

    @Test
    void theRecipientMaskedInTheLog() {
        assertThat(ReminderService.masked("+41791234567")).isEqualTo("+4179*****67");
    }

    @Test
    void theWorkshopsOwnWording_seenBeforeSaved_unknownPlaceholdersRefused() throws UnsupportedEncodingException {
        MvcTestResult preview = send("POST", "/api/reminder-settings/preview", "{ \"smsTemplate\": \"{Anrede}, {Termin}. {Datum}\" }");
        assertThat(preview).hasStatusOk().bodyJson().extractingPath("$.unknown").asArray().containsExactly("{Datum}");
        assertThat(preview).bodyJson().extractingPath("$.text").asString().startsWith("Guten Tag Herr Muster, Morgen, ");
        assertThat(preview).bodyJson().extractingPath("$.parts").isEqualTo(1);

        MvcTestResult refused = send("PUT", "/api/reminder-settings",
                "{ \"enabled\": true, \"sendTime\": \"16:00\", \"smsTemplate\": \"{Datum}\", \"version\": 0 }");
        assertThat(refused).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[0].field").isEqualTo("smsTemplate");

        MvcTestResult own = send("PUT", "/api/reminder-settings",
                "{ \"enabled\": true, \"sendTime\": \"16:00\", \"smsTemplate\": \"{Anrede}, bis {Termin}! {Firma}\", \"version\": 0 }");
        assertThat(own).hasStatusOk().bodyJson().extractingPath("$.ownTemplate").isEqualTo(true);

        task(withMobile("079 123 45 67"), "2026-12-04", null);
        service.remindDue(THURSDAY);
        assertThat(sms.sent).containsExactly("+41791234567: Guten Tag Herr Huber, bis Morgen, Fr 4.12., 08:00 Uhr! Krügel Fahrzeugtechnik");

        // back to the standard: empty
        MvcTestResult standard = send("PUT", "/api/reminder-settings", "{ \"enabled\": true, \"sendTime\": \"16:00\", \"smsTemplate\": \" \", \"version\": 1 }");
        assertThat(standard).bodyJson().extractingPath("$.ownTemplate").isEqualTo(false);
        assertThat(standard).bodyJson().extractingPath("$.smsTemplate").asString().startsWith("{Anrede}");
    }

    private void turnOn() {
        assertThat(send("PUT", "/api/reminder-settings", "{ \"enabled\": true, \"sendTime\": \"16:00\", \"version\": 0 }")).hasStatusOk();
    }

    private Map<String, String> outcomes() {
        return Map.copyOf(jdbc.query("SELECT task_id, outcome FROM task_reminder",
                rs -> {
                    Map<String, String> result = new HashMap<>();
                    while (rs.next()) {
                        result.put(rs.getString(1), rs.getString(2));
                    }
                    return result;
                }));
    }

    private Customer withMobile(String mobile) {
        return customer(null, mobile, null);
    }

    private Customer customer(String phone, String mobile, String email) {
        return customers.save(Customer.local(new CustomerDetails("Herr", "Peter", "Huber", null, null, null, null, null,
                phone, mobile, email)));
    }

    private String task(Customer customer, String date, String moreFields) {
        try {
            MvcTestResult created = send("POST", "/api/tasks", taskBody(customer, date, moreFields));
            assertThat(created).hasStatus(HttpStatus.CREATED);
            return JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private String taskBody(Customer customer, String date, String moreFields) {
        String base = "\"customerId\": \"%s\", \"acceptedById\": \"%s\", \"date\": \"%s\", \"time\": \"08:00\""
                .formatted(customer.getId(), chef, date);
        return "{ " + base + (moreFields == null ? "" : ", " + moreFields) + " }";
    }

    private MvcTestResult send(String method, String uri, String json) {
        var request = switch (method) {
            case "POST" -> mvc.post().uri(uri);
            case "PUT" -> mvc.put().uri(uri);
            default -> throw new IllegalArgumentException(method);
        };
        return request.header(CurrentPerson.HEADER, chef).contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }
}
