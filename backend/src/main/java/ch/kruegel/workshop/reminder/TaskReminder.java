package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.ReminderChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * A task's customer was reminded (17a) – or could not be: once per day the car is to be brought. The
 * address is not kept: the customer's data says it.
 */
@Entity
public class TaskReminder extends BaseEntity {

    static final int ERROR_MAX = 500;

    /** Only the ID: written by the job, read with the task */
    @Column(nullable = false)
    private UUID taskId;

    @Column(nullable = false)
    private LocalDate dropOffDate;

    /** Empty when there was no contact */
    @Enumerated(EnumType.STRING)
    private ReminderChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReminderOutcome outcome;

    private String error;

    protected TaskReminder() {
        // for JPA
    }

    TaskReminder(UUID taskId, LocalDate dropOffDate, ReminderChannel channel, ReminderOutcome outcome, String error) {
        this.taskId = Objects.requireNonNull(taskId, "taskId");
        this.dropOffDate = Objects.requireNonNull(dropOffDate, "dropOffDate");
        this.outcome = Objects.requireNonNull(outcome, "outcome");
        if ((outcome == ReminderOutcome.NO_CONTACT) != (channel == null)) {
            throw new IllegalArgumentException("A channel exactly when there was a contact: " + outcome + " / " + channel);
        }
        this.channel = channel;
        // a provider's message may be long – the start says enough
        String text = Texts.emptyToNull(error);
        this.error = text == null || text.length() <= ERROR_MAX ? text : text.substring(0, ERROR_MAX);
    }

    public UUID getTaskId() {
        return taskId;
    }

    public LocalDate getDropOffDate() {
        return dropOffDate;
    }

    public ReminderChannel getChannel() {
        return channel;
    }

    public ReminderOutcome getOutcome() {
        return outcome;
    }

    public String getError() {
        return error;
    }
}
