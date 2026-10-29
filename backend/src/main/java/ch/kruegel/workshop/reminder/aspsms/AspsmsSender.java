package ch.kruegel.workshop.reminder.aspsms;

import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;
import ch.kruegel.workshop.reminder.ReminderMessage;
import ch.kruegel.workshop.reminder.ReminderSender;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Objects;

/**
 * Sends reminders as SMS by ASPSMS (17c), a Swiss provider – its JSON API (https://json.aspsms.com).
 * A bean only when the workshop's access is set up ({@link AspsmsConfig}). The workshop's name as the
 * sender ("Kruegel": up to 11 letters, needs no unlocking).
 */
class AspsmsSender implements ReminderSender {

    static final String BASE_URL = "https://json.aspsms.com";

    /** ASPSMS's "OK" – everything else says what went wrong (ListAllStatusCodes) */
    private static final String OK = "1";
    private static final String NO_CREDITS = "5";
    private static final List<String> WRONG_ACCESS = List.of("3", "8", "9");

    private final RestClient http;
    private final String userKey;
    private final String password;
    private final String originator;

    AspsmsSender(RestClient.Builder http, String userKey, String password, String originator) {
        this.http = http.baseUrl(BASE_URL).build();
        this.userKey = Objects.requireNonNull(userKey, "userKey");
        this.password = Objects.requireNonNull(password, "password");
        this.originator = Objects.requireNonNull(originator, "originator");
    }

    @Override
    public ReminderChannel channel() {
        return ReminderChannel.SMS;
    }

    @Override
    public void send(ReminderContact to, ReminderMessage message) {
        AspsmsAnswer response;
        try {
            response = http.post()
                    .uri("/SendSimpleTextSMS")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new AspsmsMessage(userKey, password, originator, List.of(to.recipient()), message.text()))
                    .retrieve()
                    .body(AspsmsAnswer.class);
        } catch (RestClientException e) {
            throw new IllegalStateException("ASPSMS nicht erreichbar: " + e.getMessage(), e);
        }
        if (response == null || !OK.equals(response.statusCode())) {
            throw new IllegalStateException(reason(response));
        }
    }

    /** What the workshop is told – the two that happen in practice in its words */
    private static String reason(AspsmsAnswer response) {
        if (response == null) {
            return "ASPSMS: keine Antwort";
        }
        if (NO_CREDITS.equals(response.statusCode())) {
            return "Kein Guthaben bei ASPSMS – bitte aufladen";
        }
        if (WRONG_ACCESS.contains(response.statusCode())) {
            return "ASPSMS-Zugang falsch – Userkey und Passwort in der .env prüfen";
        }
        return "ASPSMS: " + response.statusInfo() + " (" + response.statusCode() + ")";
    }

    record AspsmsMessage(
            @JsonProperty("UserName") String userName,
            @JsonProperty("Password") String password,
            @JsonProperty("Originator") String originator,
            @JsonProperty("Recipients") List<String> recipients,
            @JsonProperty("MessageText") String messageText) {
    }

    record AspsmsAnswer(@JsonProperty("StatusCode") String statusCode, @JsonProperty("StatusInfo") String statusInfo) {
    }
}
