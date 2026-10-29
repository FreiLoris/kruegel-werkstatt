package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderTextTest {

    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 28);
    private static final CustomerDetails HUBER = new CustomerDetails("Herr", "Peter", "Huber", null, null, null, null, null, null, null, null);

    @Test
    void tomorrowAtItsTime() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(8, 0), false)
                .message(WEDNESDAY, "Krügel Fahrzeugtechnik", "052 123 45 67", SmsTemplate.STANDARD);
        assertThat(message.text()).isEqualTo("""
                Guten Tag Herr Huber

                Wir erinnern Sie an Ihren Termin:
                Morgen, Do 29.10., 08:00 Uhr
                Fahrzeug SH 12345

                Bei Verhinderung bitte melden:
                052 123 45 67

                Freundliche Grüsse
                Krügel Fahrzeugtechnik""");
    }

    @Test
    void onMondayFromFriday_withoutTimeOrPlate_theirLinesLeftOut() {
        CustomerDetails company = new CustomerDetails(null, null, null, "Muster AG", null, null, null, null, null, null, null);
        LocalDate friday = LocalDate.of(2026, 10, 30);
        ReminderMessage message = new ReminderText(company, null, friday.plusDays(3), null, false)
                .message(friday, "Garage", "052 123 45 67", SmsTemplate.STANDARD);
        assertThat(message.text()).isEqualTo("""
                Guten Tag

                Wir erinnern Sie an Ihren Termin:
                Mo 2.11.

                Bei Verhinderung bitte melden:
                052 123 45 67

                Freundliche Grüsse
                Garage""");
    }

    @Test
    void aCarThatComesEarlierIsToBeBroughtThen() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(17, 0), true)
                .message(WEDNESDAY, "Garage", null, SmsTemplate.STANDARD);
        assertThat(message.text()).contains("Wir erinnern Sie an Ihren Termin:\nMorgen, Do 29.10., 17:00 Uhr (bitte Fahrzeug bringen)\n");
    }

    @Test
    void theWorkshopsOwnWording() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(8, 0), false)
                .message(WEDNESDAY, "Krügel", "052 123 45 67", "{Anrede}, Termin {Termin} ({Kennzeichen}). {Firma}, {Telefon}");
        assertThat(message.text()).isEqualTo("Guten Tag Herr Huber, Termin Morgen, Do 29.10., 08:00 Uhr (SH 12345). Krügel, 052 123 45 67");
    }

    @Test
    void theStandardOnlyInTheSmsAlphabet() {
        ReminderMessage message = new ReminderText(HUBER, "SH 12345", WEDNESDAY.plusDays(1), LocalTime.of(8, 0), true)
                .message(WEDNESDAY, "Krügel Fahrzeugtechnik", "052 123 45 67", SmsTemplate.STANDARD);
        assertThat(SmsLength.of(message.text()).replaced()).isEmpty();
    }

    @Test
    void unknownPlaceholdersAreFound() {
        assertThat(SmsTemplate.unknownPlaceholders("{Anrede} am {Datum} {Datum} {Firma} {}")).containsExactly("{Datum}", "{}");
        assertThat(SmsTemplate.unknownPlaceholders(SmsTemplate.STANDARD)).isEmpty();
    }

    @Test
    void aLeftOutLineLeavesNoDoubleGap() {
        assertThat(SmsTemplate.fill("A\n\n{Kennzeichen}\n\nB", Map.of())).isEqualTo("A\n\nB");
    }

    @Test
    void whatAnSmsCosts() {
        assertThat(SmsLength.of("a".repeat(160))).isEqualTo(new SmsLength(160, 1, List.of()));
        assertThat(SmsLength.of("a".repeat(161)).parts()).isEqualTo(2);
        assertThat(SmsLength.of("a".repeat(306)).parts()).isEqualTo(2);
        assertThat(SmsLength.of("a".repeat(307)).parts()).isEqualTo(3);
        // € counts twice, the dash and č are replaced
        assertThat(SmsLength.of("10 € – Hrvoje Babič")).isEqualTo(new SmsLength(20, 1, List.of("–", "č")));
    }
}
