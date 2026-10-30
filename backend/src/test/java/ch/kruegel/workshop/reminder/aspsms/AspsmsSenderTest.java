package ch.kruegel.workshop.reminder.aspsms;

import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;
import ch.kruegel.workshop.reminder.ReminderMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AspsmsSenderTest {

    private static final ReminderContact HUBER = new ReminderContact(ReminderChannel.SMS, "+41791234567");
    private static final ReminderMessage MESSAGE = new ReminderMessage("Kruegel", "Guten Tag Herr Huber, …");

    private MockRestServiceServer aspsms;
    private AspsmsSender sender;

    @BeforeEach
    void start() {
        RestClient.Builder http = RestClient.builder();
        aspsms = MockRestServiceServer.bindTo(http).build();
        sender = new AspsmsSender(http, "KEY", "secret");
    }

    @Test
    void sendsTheTextToTheNumber() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("""
                        { "UserName": "KEY", "Password": "secret", "Originator": "Kruegel",
                          "Recipients": ["+41791234567"], "MessageText": "Guten Tag Herr Huber, …", "ForceGSM7bit": true }""", true))
                .andRespond(withSuccess("{ \"StatusCode\": \"1\", \"StatusInfo\": \"OK\" }", MediaType.APPLICATION_JSON));

        assertThatCode(() -> sender.send(HUBER, MESSAGE)).doesNotThrowAnyException();
        aspsms.verify();
    }

    @Test
    void noCreditsSaidInTheWorkshopsWords() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS"))
                .andRespond(withSuccess("{ \"StatusCode\": \"5\", \"StatusInfo\": \"Not enough credits available.\" }", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> sender.send(HUBER, MESSAGE)).hasMessage("Kein Guthaben bei ASPSMS – bitte aufladen");
    }

    @Test
    void aWrongAccessSaysWhereToLook() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS"))
                .andRespond(withSuccess("{ \"StatusCode\": \"9\", \"StatusInfo\": \"Invalid Password.\" }", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> sender.send(HUBER, MESSAGE)).hasMessage("ASPSMS-Zugang falsch – Userkey und Passwort in der .env prüfen");
    }

    @Test
    void anEmptyAnswer() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS")).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> sender.send(HUBER, MESSAGE)).hasMessage("ASPSMS: keine Antwort");
    }

    @Test
    void anotherRefusalWithItsCode() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS"))
                .andRespond(withSuccess("{ \"StatusCode\": \"10\", \"StatusInfo\": \"Invalid originator.\" }", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> sender.send(HUBER, MESSAGE)).hasMessage("ASPSMS: Invalid originator. (10)");
    }

    @Test
    void anErrorOfTheirs() {
        aspsms.expect(requestTo("https://json.aspsms.com/SendSimpleTextSMS")).andRespond(withServerError());
        assertThatThrownBy(() -> sender.send(HUBER, MESSAGE)).hasMessageStartingWith("ASPSMS antwortet mit Fehler");
    }
}
