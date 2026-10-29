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

    protected ReminderSettings() {
        // for JPA
    }

    public void update(boolean enabled, LocalTime sendTime) {
        Objects.requireNonNull(sendTime, "sendTime");
        if (sendTime.isBefore(EARLIEST) || sendTime.isAfter(LATEST)) {
            throw new IllegalArgumentException("Send time must be " + EARLIEST + "–" + LATEST + ": " + sendTime);
        }
        this.enabled = enabled;
        this.sendTime = sendTime;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public LocalTime getSendTime() {
        return sendTime;
    }
}
