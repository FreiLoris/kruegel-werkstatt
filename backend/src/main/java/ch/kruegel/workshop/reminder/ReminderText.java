package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * The reminder's wording (17a) – short enough for two SMS:
 * "Guten Tag Herr Huber, wir erinnern Sie an Ihren Termin morgen, Do 30.10., um 08:00 (SH 12345). Bei
 * Verhinderung bitte melden: 052 … Freundliche Grüsse, Krügel Fahrzeugtechnik".
 *
 * @param customer    who is greeted
 * @param plate       the car's licence plate; may be open
 * @param day         when the car is to be brought – the appointment, or the day it comes earlier
 * @param time        at what time; empty when the time is still open ("Zeit offen")
 * @param bringEarlier the car comes before the appointment – then that is what the customer is told
 */
record ReminderText(CustomerDetails customer, String plate, LocalDate day, LocalTime time, boolean bringEarlier) {

    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("d.M.");
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

    ReminderMessage message(LocalDate today, String company, String companyPhone) {
        boolean tomorrow = day.equals(today.plusDays(1));
        String weekday = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.GERMAN).replace(".", "");
        String when = (tomorrow ? "morgen, " : "am ") + weekday + " " + DAY_MONTH.format(day)
                + (time == null ? "" : (tomorrow ? ", um " : " um ") + CLOCK.format(time));
        String car = plate == null ? "" : " (" + plate + ")";
        String what = bringEarlier
                ? "wir erinnern Sie an Ihren Termin: Bitte bringen Sie Ihr Fahrzeug" + car + " " + when
                : "wir erinnern Sie an Ihren Termin " + when + car;
        String call = companyPhone == null ? "Bei Verhinderung bitte kurz melden." : "Bei Verhinderung bitte melden: " + companyPhone + ".";
        // "am Mo 2.11." ends the sentence already
        String text = greeting() + ", " + what + (what.endsWith(".") ? " " : ". ") + call + " Freundliche Grüsse, " + company;
        return new ReminderMessage("Terminerinnerung – " + company, text);
    }

    /** "Guten Tag Herr Huber" – a company or an unknown salutation: "Guten Tag" */
    private String greeting() {
        String salutation = customer.salutation() == null ? "" : customer.salutation().toLowerCase(Locale.ROOT);
        String title = salutation.startsWith("herr") ? "Herr" : salutation.startsWith("frau") ? "Frau" : null;
        return title == null || customer.lastName() == null ? "Guten Tag" : "Guten Tag " + title + " " + customer.lastName();
    }
}
