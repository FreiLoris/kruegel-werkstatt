package ch.kruegel.workshop.reminder;

import org.junit.jupiter.api.Test;

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
}
