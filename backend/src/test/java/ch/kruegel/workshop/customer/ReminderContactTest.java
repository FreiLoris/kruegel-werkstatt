package ch.kruegel.workshop.customer;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderContactTest {

    @Test
    void aSwissMobileNumberHoweverWritten() {
        assertThat(ReminderContact.textableNumber("079 123 45 67", false)).contains("+41791234567");
        assertThat(ReminderContact.textableNumber("0041 77 452 79 43", false)).contains("+41774527943");
        assertThat(ReminderContact.textableNumber("+41 (0)76 123.45.67", false)).contains("+41761234567");
        assertThat(ReminderContact.textableNumber("078/123-45-67", false)).contains("+41781234567");
    }

    @Test
    void aLandlineOrNoNumberIsNotTexted() {
        assertThat(ReminderContact.textableNumber("052 123 45 67", true)).isEmpty();
        assertThat(ReminderContact.textableNumber("+41 52 123 45 67", true)).isEmpty();
        assertThat(ReminderContact.textableNumber("Natel siehe Notiz", true)).isEmpty();
        assertThat(ReminderContact.textableNumber("079 123", true)).isEmpty();
    }

    @Test
    void aForeignNumberOnlyAsTheMobile() {
        assertThat(ReminderContact.textableNumber("+49 151 2345 6789", true)).contains("+4915123456789");
        assertThat(ReminderContact.textableNumber("+49 151 2345 6789", false)).isEmpty();
    }

    @Test
    void anSmsToTheMobileElseNothing() {
        assertThat(ReminderContact.of(customer("052 000 00 00", "079 123 45 67", "a@b.ch")))
                .contains(new ReminderContact(ReminderChannel.SMS, "+41791234567"));
        // a mobile number in the phone field counts too
        assertThat(ReminderContact.of(customer("076 123 45 67", null, "a@b.ch")))
                .contains(new ReminderContact(ReminderChannel.SMS, "+41761234567"));
        // no e-mail for now: to be called
        assertThat(ReminderContact.of(customer("052 000 00 00", null, "a@b.ch"))).isEqualTo(Optional.empty());
        assertThat(ReminderContact.of(customer(null, null, null))).isEmpty();
    }

    private static CustomerDetails customer(String phone, String mobile, String email) {
        return new CustomerDetails("Herr", "Peter", "Huber", null, null, null, null, null, phone, mobile, email);
    }
}
