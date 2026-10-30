package ch.kruegel.workshop.reminder;

import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class SmsSenderNameTest {

    @Test
    void fromTheCompanyName() {
        assertThat(SmsSenderName.of("Krügel Fahrzeugtechnik")).isEqualTo("Kruegel");
        assertThat(SmsSenderName.of("Rémy-Autos SA")).isEqualTo("RemyAutos");
        assertThat(SmsSenderName.of("Strassenverkehrsgarage AG")).isEqualTo("Strassenver");
        assertThat(SmsSenderName.of("  ")).isEqualTo("Werkstatt");
        assertThat(SmsSenderName.of("1234 Garage")).isEqualTo("Werkstatt");
    }

    @Test
    void whatThePhoneShows() {
        assertThat(SmsSenderName.isValid("Kruegel")).isTrue();
        assertThat(SmsSenderName.isValid("Garage24")).isTrue();
        assertThat(SmsSenderName.isValid("Garage Muster")).isFalse();
        assertThat(SmsSenderName.isValid("Krügel")).isFalse();
        assertThat(SmsSenderName.isValid("0521234567")).isFalse();
        assertThat(SmsSenderName.isValid("GarageMuster")).isFalse();
    }

    @Test
    void savedUnchanged_aKeptSenderStays() {
        ReminderSettings settings = new ReminderSettings();
        settings.update(false, LocalTime.of(16, 0), null, "Kruegel", "Krügel Fahrzeugtechnik");
        // the name changes later: the sender the customers know stays only when it was set on its own
        assertThat(settings.getSmsSender("Fahrzeugtechnik Krügel GmbH")).isEqualTo("Fahrzeugtec");

        settings.update(false, LocalTime.of(16, 0), null, "Muster", "Krügel Fahrzeugtechnik");
        settings.update(false, LocalTime.of(16, 0), null, "Muster", "Krügel Fahrzeugtechnik");
        settings.update(false, LocalTime.of(16, 0), null, null, "Krügel Fahrzeugtechnik");
        assertThat(settings.getSmsSender("Fahrzeugtechnik Krügel GmbH")).isEqualTo("Muster");

        settings.update(false, LocalTime.of(16, 0), null, " ", "Krügel Fahrzeugtechnik");
        assertThat(settings.getSmsSender("Krügel Fahrzeugtechnik")).isEqualTo("Kruegel");
    }
}
