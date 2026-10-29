package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.company.CompanyDto;
import ch.kruegel.workshop.company.CompanyService;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.ReminderChannel;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** The reminder settings (17a): read by the job and the settings page, changed in the settings. */
@Service
@Transactional
public class ReminderSettingsService {

    public static final String TOPIC = "reminder-settings";

    /** Who the preview is for */
    private static final CustomerDetails EXAMPLE = new CustomerDetails("Herr", "Hans", "Muster", null, null, null, null, null, null, null, null);

    private final ReminderSettingsRepository repository;
    private final ApplicationEventPublisher events;
    private final CompanyService company;
    private final Clock clock;
    /** The channels this installation can send on – a sender bean exists only when its access is set up */
    private final Set<ReminderChannel> ready = EnumSet.noneOf(ReminderChannel.class);

    ReminderSettingsService(ReminderSettingsRepository repository, ApplicationEventPublisher events, List<ReminderSender> senders,
                            CompanyService company, Clock clock) {
        this.repository = repository;
        this.events = events;
        this.company = company;
        this.clock = clock;
        senders.forEach(sender -> ready.add(sender.channel()));
    }

    @Transactional(readOnly = true)
    public ReminderSettingsDto settings() {
        return dto(theSettings());
    }

    public ReminderSettingsDto update(ReminderSettingsRequest request) {
        ReminderSettings settings = theSettings();
        settings.checkVersion(request.version());
        if (!ReminderSettings.isValidSendTime(request.sendTime())) {
            throw new InvalidInputException("sendTime", "muss zwischen %s und %s liegen".formatted(ReminderSettings.EARLIEST, ReminderSettings.LATEST));
        }
        if (request.smsTemplate() != null) {
            List<String> unknown = SmsTemplate.unknownPlaceholders(request.smsTemplate());
            if (!unknown.isEmpty()) {
                throw new InvalidInputException("smsTemplate", "unbekannt: %s – möglich sind %s".formatted(String.join(", ", unknown), known()));
            }
        }
        settings.update(request.enabled(), request.sendTime(), request.smsTemplate());
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return dto(settings);
    }

    ReminderSettings theSettings() {
        return repository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Reminder settings missing – migration V57 creates them"));
    }

    /** A wording as an example customer gets it – Herr Muster, SH 12345, tomorrow at 08:00 */
    @Transactional(readOnly = true)
    public SmsPreviewDto preview(SmsPreviewRequest request) {
        String template = request.smsTemplate().isBlank() ? SmsTemplate.STANDARD : request.smsTemplate();
        LocalDate today = LocalDate.now(clock);
        CompanyDto workshop = company.get();
        String text = new ReminderText(EXAMPLE, "SH 12345", today.plusDays(1), LocalTime.of(8, 0), false)
                .message(today, workshop.name(), workshop.phone(), template).text();
        SmsLength length = SmsLength.of(text);
        return new SmsPreviewDto(text, length.characters(), length.parts(), length.replaced(), SmsTemplate.unknownPlaceholders(template));
    }

    private static String known() {
        return SmsTemplate.PLACEHOLDERS.stream().map(p -> "{" + p + "}").collect(Collectors.joining(", "));
    }

    private ReminderSettingsDto dto(ReminderSettings s) {
        return new ReminderSettingsDto(s.getVersion(), s.isEnabled(), s.getSendTime(), ready.contains(ReminderChannel.SMS),
                s.getSmsTemplate(), s.hasOwnTemplate(), SmsTemplate.STANDARD, SmsTemplate.PLACEHOLDERS);
    }
}
