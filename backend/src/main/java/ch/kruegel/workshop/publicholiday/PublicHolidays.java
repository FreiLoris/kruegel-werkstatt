package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.live.DataChanged;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * The workshop's public holidays, computed – the ones chosen in the settings (neutral 2, until then
 * the canton of Zurich's days). Easter and Whit Sunday are Sundays anyway, but calendars show their name.
 *
 * <p>Used for the employee calendar (9b), vacation statistics – vacation days are working days only
 * (9c) – the capacity overview and the reminders (17a).
 */
@Component
public class PublicHolidays {

    private final Supplier<Set<HolidayRule>> stored;
    /** Asked on every working-day check (a year of vacation statistics: hundreds) – kept until changed */
    private volatile Set<HolidayRule> chosen;

    @Autowired
    PublicHolidays(PublicHolidaySettingsRepository repository) {
        this(() -> repository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Public holiday settings missing – migration V61 creates them"))
                .getRules());
    }

    /** With fixed holidays – for tests */
    PublicHolidays(Supplier<Set<HolidayRule>> stored) {
        this.stored = stored;
    }

    /** Changed in the settings: read again – only after the commit, before it another request would keep the old ones */
    @TransactionalEventListener(fallbackExecution = true)
    void onChanged(DataChanged event) {
        if (PublicHolidaySettingsService.TOPIC.equals(event.topic())) {
            chosen = null;
        }
    }

    private Set<HolidayRule> chosen() {
        Set<HolidayRule> rules = chosen;
        if (rules == null) {
            rules = stored.get();
            chosen = rules;
        }
        return rules;
    }

    /** All public holidays of a year, sorted by date. */
    public List<PublicHoliday> forYear(int year) {
        return chosen().stream()
                .map(rule -> rule.in(year))
                .sorted(Comparator.comparing(PublicHoliday::date))
                .toList();
    }

    /** All public holidays from {@code from} to {@code to} (both inclusive), sorted by date. */
    public List<PublicHoliday> between(LocalDate from, LocalDate to) {
        return Stream.iterate(from.getYear(), year -> year <= to.getYear(), year -> year + 1)
                .flatMap(year -> forYear(year).stream())
                .filter(h -> !h.date().isBefore(from) && !h.date().isAfter(to))
                .toList();
    }

    public boolean isPublicHoliday(LocalDate date) {
        return forYear(date.getYear()).stream().anyMatch(h -> h.date().equals(date));
    }

    /** Monday to Friday and not a public holiday – e.g. for counting vacation days. */
    public boolean isWorkingDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && !isPublicHoliday(date);
    }
}
