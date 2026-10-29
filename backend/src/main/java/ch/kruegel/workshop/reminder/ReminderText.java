package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * The reminder for one task (17a): the workshop's template ({@link SmsTemplate}, 17e) with this
 * task's values – by default:
 * <pre>
 * Guten Tag Herr Huber
 *
 * Wir erinnern Sie an Ihren Termin:
 * Morgen, Do 30.10., 08:00 Uhr
 * Fahrzeug SH 12345
 *
 * Bei Verhinderung bitte melden:
 * 052 123 45 67
 *
 * Freundliche Grüsse
 * Krügel Fahrzeugtechnik
 * </pre>
 *
 * @param customer     who is greeted
 * @param plate        the car's licence plate; may be open
 * @param day          when the car is to be brought – the appointment, or the day it comes earlier
 * @param time         at what time; empty when the time is still open ("Zeit offen")
 * @param bringEarlier the car comes before the appointment – then that is what the customer is told
 */
record ReminderText(CustomerDetails customer, String plate, LocalDate day, LocalTime time, boolean bringEarlier) {

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("d.M.");
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

    ReminderMessage message(LocalDate today, String company, String companyPhone, String template) {
        Map<String, String> values = new HashMap<>();
        values.put(SmsTemplate.GREETING, greeting());
        values.put(SmsTemplate.WHEN, when(today));
        values.put(SmsTemplate.PLATE, plate);
        values.put(SmsTemplate.PHONE, companyPhone);
        values.put(SmsTemplate.COMPANY, company);
        return new ReminderMessage(SmsTemplate.fill(template, values));
    }

    /** "Morgen, Fr 30.10., 08:00 Uhr" – "Mo 2.11." when the time is open */
    private String when(LocalDate today) {
        String weekday = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.GERMAN).replace(".", "");
        return (day.equals(today.plusDays(1)) ? "Morgen, " : "") + weekday + " " + DAY_MONTH.format(day)
                + (time == null ? "" : ", " + CLOCK.format(time) + " Uhr")
                + (bringEarlier ? " (bitte Fahrzeug bringen)" : "");
    }

    /** "Guten Tag Herr Huber" – a company or an unknown salutation: "Guten Tag" */
    private String greeting() {
        String salutation = customer.salutation() == null ? "" : customer.salutation().toLowerCase(Locale.ROOT);
        String title = salutation.startsWith("herr") ? "Herr" : salutation.startsWith("frau") ? "Frau" : null;
        return title == null || customer.lastName() == null ? "Guten Tag" : "Guten Tag " + title + " " + customer.lastName();
    }
}
