package ch.kruegel.workshop.publicholiday;

import java.time.LocalDate;

/**
 * A public holiday.
 *
 * @param date business date
 * @param name German name as people in the workshop know it, e.g. "Auffahrt" – shown in the UI
 */
public record PublicHoliday(LocalDate date, String name) {
}
