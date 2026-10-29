package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.company.CompanyDto;
import ch.kruegel.workshop.company.CompanyService;
import ch.kruegel.workshop.customer.CustomerDetails;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;

/** A wording as an example customer gets it, and what it costs (17e) – for the settings, nothing is saved. */
@Service
public class SmsPreviewService {

    /** Herr Muster, his car SH 12345, tomorrow at 08:00 */
    private static final CustomerDetails EXAMPLE_CUSTOMER = new CustomerDetails("Herr", "Hans", "Muster",
            null, null, null, null, null, null, null, null);
    private static final String EXAMPLE_PLATE = "SH 12345";
    private static final LocalTime EXAMPLE_TIME = LocalTime.of(8, 0);

    private final CompanyService company;
    private final Clock clock;

    SmsPreviewService(CompanyService company, Clock clock) {
        this.company = company;
        this.clock = clock;
    }

    public SmsPreviewDto preview(SmsPreviewRequest request) {
        String template = request.smsTemplate().isBlank() ? SmsTemplate.STANDARD : request.smsTemplate();
        LocalDate today = LocalDate.now(clock);
        CompanyDto workshop = company.get();
        String text = new ReminderText(EXAMPLE_CUSTOMER, EXAMPLE_PLATE, today.plusDays(1), EXAMPLE_TIME, false)
                .message(today, workshop.name(), workshop.phone(), template).text();
        SmsLength length = SmsLength.of(text);
        return new SmsPreviewDto(text, length.characters(), length.parts(), length.replaced(), SmsTemplate.unknownPlaceholders(template));
    }
}
