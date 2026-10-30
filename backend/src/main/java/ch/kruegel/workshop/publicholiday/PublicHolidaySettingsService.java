package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.live.DataChanged;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.Set;

/** Which public holidays the workshop has (neutral 2): every one the app knows, the chosen ones ticked. */
@Service
@Transactional
public class PublicHolidaySettingsService {

    /** The holidays' own topic: a change reloads every calendar right away */
    public static final String TOPIC = "public-holidays";

    private final PublicHolidaySettingsRepository repository;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    PublicHolidaySettingsService(PublicHolidaySettingsRepository repository, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PublicHolidaySettingsDto settings() {
        return dto(theSettings());
    }

    public PublicHolidaySettingsDto update(PublicHolidaySettingsRequest request) {
        PublicHolidaySettings settings = theSettings();
        settings.checkVersion(request.version());
        Set<HolidayRule> rules = EnumSet.noneOf(HolidayRule.class);
        rules.addAll(request.holidays());
        settings.update(rules);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return dto(settings);
    }

    private PublicHolidaySettings theSettings() {
        return repository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Public holiday settings missing – migration V61 creates them"));
    }

    private PublicHolidaySettingsDto dto(PublicHolidaySettings settings) {
        int year = LocalDate.now(clock).getYear();
        Set<HolidayRule> chosen = settings.getRules();
        return new PublicHolidaySettingsDto(settings.getVersion(), Arrays.stream(HolidayRule.values())
                .map(rule -> new PublicHolidayChoiceDto(rule, rule.holidayName(), rule.in(year).date(), chosen.contains(rule)))
                .sorted(Comparator.comparing(PublicHolidayChoiceDto::date))
                .toList());
    }
}
