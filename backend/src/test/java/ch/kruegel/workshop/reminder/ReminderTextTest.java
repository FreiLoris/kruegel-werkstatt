package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderTextTest {

    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 28);
    private static final CustomerDetails HUBER = new CustomerDetails("Herr", "Peter", "Huber", null, null, null, null, null, null, null, null);

    @Test
    void tomorrowAtItsTime() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(8, 0), false)
                .message(WEDNESDAY, "Krügel Fahrzeugtechnik", "052 123 45 67");
        assertThat(message.text()).isEqualTo("""
                Guten Tag Herr Huber

                Wir erinnern Sie an Ihren Termin:
                Morgen, Do 29.10., 08:00 Uhr
                Fahrzeug SH 12345

                Bei Verhinderung bitte melden:
                052 123 45 67

                Freundliche Grüsse
                Krügel Fahrzeugtechnik""");
        assertThat(message.subject()).isEqualTo("Terminerinnerung Krügel Fahrzeugtechnik");
    }

    @Test
    void onMondayFromFridayWithoutTimeOrPlate() {
        CustomerDetails company = new CustomerDetails(null, null, null, "Muster AG", null, null, null, null, null, null, null);
        LocalDate friday = LocalDate.of(2026, 10, 30);
        ReminderMessage message = new ReminderText(company, null, friday.plusDays(3), null, false).message(friday, "Garage", null);
        assertThat(message.text()).isEqualTo("""
                Guten Tag

                Wir erinnern Sie an Ihren Termin:
                Mo 2.11.

                Bei Verhinderung bitte kurz melden.

                Freundliche Grüsse
                Garage""");
    }

    @Test
    void aCarThatComesEarlierIsToBeBroughtThen() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(17, 0), true)
                .message(WEDNESDAY, "Garage", null);
        assertThat(message.text()).contains("Wir erinnern Sie an Ihren Termin. Bitte bringen Sie Ihr Fahrzeug:\nMorgen, Do 29.10., 17:00 Uhr\n");
    }

    @Test
    void onlyTheSmsAlphabet() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(8, 0), true)
                .message(WEDNESDAY, "Krügel Fahrzeugtechnik", "052 123 45 67");
        // GSM 7-bit: no dash, no guillemets, no typographic quotes
        assertThat(message.text()).doesNotContain("–", "«", "»", "„", "“");
    }
}
