package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.time.LocalTime;
import java.util.Objects;

/** Whether customers are reminded of their appointments, and from when on the day before (17a) – exactly one row (V57). */
@Entity
public class ReminderSettings extends BaseEntity {

    /** Not before the workshop's day has started … */
    static final LocalTime EARLIEST = LocalTime.of(8, 0);
    /** … and so late that there is still time to send before {@link ReminderService#SEND_UNTIL} */
    static final LocalTime LATEST = LocalTime.of(19, 0);

    /** Off until the workshop turns it on */
    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private LocalTime sendTime;

    /** The workshop's own wording (17e); empty = {@link SmsTemplate#STANDARD} */
    private String smsTemplate;

    protected ReminderSettings() {
        // for JPA
    }

    /** {@link #EARLIEST} to {@link #LATEST} */
    static boolean isValidSendTime(LocalTime sendTime) {
        return !sendTime.isBefore(EARLIEST) && !sendTime.isAfter(LATEST);
    }

    public void update(boolean enabled, LocalTime sendTime, String smsTemplate) {
        Objects.requireNonNull(sendTime, "sendTime");
        if (!isValidSendTime(sendTime)) {
            throw new IllegalArgumentException("Send time must be " + EARLIEST + "–" + LATEST + ": " + sendTime);
        }
        if (smsTemplate != null && !SmsTemplate.unknownPlaceholders(smsTemplate).isEmpty()) {
            throw new IllegalArgumentException("Unknown placeholders: " + SmsTemplate.unknownPlaceholders(smsTemplate));
        }
        this.enabled = enabled;
        this.sendTime = sendTime;
        // null: unchanged (a device with an older app does not send it). The standard text is kept as
        // "none" – a later better standard then reaches the workshop too.
        if (smsTemplate != null) {
            String template = smsTemplate.strip();
            this.smsTemplate = template.isEmpty() || template.equals(SmsTemplate.STANDARD) ? null : template;
        }
    }

    /** The wording to send – the workshop's own, else the standard */
    public String getSmsTemplate() {
        return smsTemplate == null ? SmsTemplate.STANDARD : smsTemplate;
    }

    public boolean hasOwnTemplate() {
        return smsTemplate != null;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public LocalTime getSendTime() {
        return sendTime;
    }
}
