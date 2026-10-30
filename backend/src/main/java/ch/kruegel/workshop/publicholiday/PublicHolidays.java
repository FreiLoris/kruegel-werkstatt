package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.live.DataChanged;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * The workshop's public holidays, computed – the ones chosen in the settings (neutral 2; V61 chooses the
 * canton of Zurich's days). Easter and Whit Sunday are Sundays anyway, but calendars show their name.
 *
 * <p>Used for the employee calendar (9b), vacation statistics – vacation days are working days only
 * (9c) – the capacity overview and the reminders (17a).
 */
@Component
public class PublicHolidays {

    private final Supplier<Set<HolidayRule>> stored;
    /** Asked on every working-day check (a year of vacation statistics: hundreds) – kept until changed */
    private volatile Set<HolidayRule> chosen;
    /** Counts the changes: a load that started before one must not keep what it read */
    private final AtomicLong changes = new AtomicLong();

    @Autowired
    PublicHolidays(PublicHolidaySettingsRepository repository) {
        this(() -> repository.theSettings().getRules());
    }

    /** With fixed holidays – for tests */
    PublicHolidays(Supplier<Set<HolidayRule>> stored) {
        this.stored = stored;
    }

    /**
     * Changed in the settings: read again – only after the commit (before it another request would keep the
     * old ones), and before the devices are told (LiveUpdateService): they ask right away.
     */
    @TransactionalEventListener(fallbackExecution = true)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    void onChanged(DataChanged event) {
        if (PublicHolidaySettingsService.TOPIC.equals(event.topic())) {
            changes.incrementAndGet();
            chosen = null;
        }
    }

    private Set<HolidayRule> chosen() {
        Set<HolidayRule> rules = chosen;
        if (rules == null) {
            long before = changes.get();
            rules = stored.get();
            // changed while reading: use what was read this once, but keep nothing
            if (changes.get() == before) {
                chosen = rules;
            }
        }
        return rules;
    }

    /** All public holidays of a year, sorted by date – two on one day as one: "Auffahrt / Tag der Arbeit". */
    public List<PublicHoliday> forYear(int year) {
        Map<LocalDate, String> byDate = chosen().stream()
                .map(rule -> rule.in(year))
                .collect(Collectors.toMap(PublicHoliday::date, PublicHoliday::name, (a, b) -> a + " / " + b, TreeMap::new));
        return byDate.entrySet().stream().map(e -> new PublicHoliday(e.getKey(), e.getValue())).toList();
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
