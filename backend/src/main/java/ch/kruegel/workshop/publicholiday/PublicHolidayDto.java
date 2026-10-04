package ch.kruegel.workshop.publicholiday;

import java.time.LocalDate;

/** A public holiday as delivered by the API. */
public record PublicHolidayDto(LocalDate date, String name) {

    static PublicHolidayDto of(PublicHoliday holiday) {
        return new PublicHolidayDto(holiday.date(), holiday.name());
    }
}
