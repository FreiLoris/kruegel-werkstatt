package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * The reminder's wording (17a) – in short lines, the day on a line of its own (feedback 2026-10-29:
 * one block read badly on the phone):
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
 * Only characters of the SMS alphabet (GSM 7-bit) – one dash or guillemet would make every SMS cost
 * more than twice as much.
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

    ReminderMessage message(LocalDate today, String company, String companyPhone) {
        String weekday = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.GERMAN).replace(".", "");
        String when = (day.equals(today.plusDays(1)) ? "Morgen, " : "") + weekday + " " + DAY_MONTH.format(day)
                + (time == null ? "" : ", " + CLOCK.format(time) + " Uhr");
        StringBuilder text = new StringBuilder(greeting()).append("\n\n")
                .append(bringEarlier ? "Wir erinnern Sie an Ihren Termin. Bitte bringen Sie Ihr Fahrzeug:" : "Wir erinnern Sie an Ihren Termin:")
                .append('\n').append(when);
        if (plate != null) {
            text.append("\nFahrzeug ").append(plate);
        }
        text.append("\n\n").append(companyPhone == null ? "Bei Verhinderung bitte kurz melden." : "Bei Verhinderung bitte melden:" + (char) 10 + companyPhone)
                .append("\n\nFreundliche Grüsse\n").append(company);
        return new ReminderMessage("Terminerinnerung " + company, text.toString());
    }

    /** "Guten Tag Herr Huber" – a company or an unknown salutation: "Guten Tag" */
    private String greeting() {
        String salutation = customer.salutation() == null ? "" : customer.salutation().toLowerCase(Locale.ROOT);
        String title = salutation.startsWith("herr") ? "Herr" : salutation.startsWith("frau") ? "Frau" : null;
        return title == null || customer.lastName() == null ? "Guten Tag" : "Guten Tag " + title + " " + customer.lastName();
    }
}
