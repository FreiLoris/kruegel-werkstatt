package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.company.CompanyDto;
import ch.kruegel.workshop.company.CompanyService;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;
import ch.kruegel.workshop.publicholiday.ZurichPublicHolidays;
import ch.kruegel.workshop.task.Appointment;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reminds customers of their appointments (17a): on a working day, from the set time on, every
 * customer who is to bring the car before the next working day – on Friday also for Saturday to
 * Monday. An SMS, else an e-mail; once per task and day. What happened is kept with the task, also
 * when nothing could be sent – then someone has to call (shown with the task from 17d on).
 *
 * <p>Not reminded: a task taken off ("nicht erinnern"), a customer who wants none, a car already
 * here or a task started or done ({@link TaskRepository#toRemind}), and a task taken today – the
 * customer just spoke to us.
 */
@Service
public class ReminderService {

    /** Not later in the evening – a task planned after that is not reminded */
    static final LocalTime SEND_UNTIL = LocalTime.of(20, 0);

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final ReminderSettingsService settings;
    private final TaskReminderRepository reminders;
    private final TaskRepository tasks;
    private final ZurichPublicHolidays holidays;
    private final CompanyService company;
    private final Map<ReminderChannel, ReminderSender> senders = new EnumMap<>(ReminderChannel.class);
    private final TransactionTemplate transaction;
    private final Clock clock;

    ReminderService(ReminderSettingsService settings, TaskReminderRepository reminders, TaskRepository tasks,
                    ZurichPublicHolidays holidays, CompanyService company, List<ReminderSender> senders,
                    PlatformTransactionManager transactions, Clock clock) {
        this.settings = settings;
        this.reminders = reminders;
        this.tasks = tasks;
        this.holidays = holidays;
        this.company = company;
        senders.forEach(sender -> this.senders.put(sender.channel(), sender));
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    /** Called by {@link ReminderJob} every few minutes: whoever is due now is reminded. */
    public void remindDue() {
        remindDue(LocalDateTime.now(clock));
    }

    void remindDue(LocalDateTime now) {
        // read in one go; each one sent and kept on its own – one that fails stops nothing else
        for (Due due : transaction.execute(status -> due(now))) {
            try {
                remind(due);
            } catch (RuntimeException e) {
                // sent, but not kept (database gone): the next run sends it again – rather twice than not at all
                log.error("Reminder of task {} not kept", due.taskNumber(), e);
            }
        }
    }

    private List<Due> due(LocalDateTime now) {
        ReminderSettings current = settings.theSettings();
        LocalDate today = now.toLocalDate();
        LocalTime time = now.toLocalTime();
        if (!current.isEnabled() || !holidays.isWorkingDay(today) || time.isBefore(current.getSendTime()) || !time.isBefore(SEND_UNTIL)) {
            return List.of();
        }
        LocalDate first = today.plusDays(1);
        LocalDate last = first;
        while (!holidays.isWorkingDay(last)) {
            last = last.plusDays(1);
        }
        Set<Reminded> done = reminders.findByDropOffDateBetween(first, last).stream()
                .map(r -> new Reminded(r.getTaskId(), r.getDropOffDate()))
                .collect(Collectors.toSet());
        CompanyDto workshop = company.get();
        List<Due> result = new ArrayList<>();
        for (Task task : tasks.toRemind(first, last)) {
            Appointment appointment = task.getAppointment();
            boolean earlier = appointment.arrivesEarlier() != null;
            LocalDateTime dropOff = earlier ? appointment.arrivesEarlier() : appointment.date().atTime(appointment.time());
            LocalDate day = dropOff.toLocalDate();
            if (LocalDate.ofInstant(task.getCreatedAt(), clock.getZone()).equals(today) || done.contains(new Reminded(task.getId(), day))) {
                continue;
            }
            Customer customer = task.getCustomer();
            String plate = task.getVehicle() == null ? null : task.getVehicle().getDetails().licensePlate();
            LocalTime at = appointment.timeOpen() && !earlier ? null : dropOff.toLocalTime();
            ReminderMessage message = new ReminderText(customer.getDetails(), plate, day, at, earlier)
                    .message(today, workshop.name(), workshop.phone());
            result.add(new Due(task.getId(), task.getTaskNumber(), day, ReminderContact.of(customer.getDetails()), message));
        }
        return result;
    }

    private void remind(Due due) {
        if (due.contact().isEmpty()) {
            log.info("Reminder of task {}: no mobile number and no e-mail – to be called", due.taskNumber());
            reminders.save(new TaskReminder(due.taskId(), due.day(), null, ReminderOutcome.NO_CONTACT, null));
            return;
        }
        ReminderContact to = due.contact().get();
        ReminderSender sender = senders.get(to.channel());
        if (sender == null) {
            log.info("Reminder of task {} by {} to {}: not set up on this installation – only logged", due.taskNumber(), to.channel(),
                    masked(to.recipient()));
            log.debug("Reminder text: {}", due.message().text());
            reminders.save(new TaskReminder(due.taskId(), due.day(), to.channel(), ReminderOutcome.LOGGED, null));
            return;
        }
        ReminderOutcome outcome;
        String error = null;
        try {
            sender.send(to, due.message());
            outcome = ReminderOutcome.SENT;
            log.info("Reminder of task {} sent by {} to {}", due.taskNumber(), to.channel(), masked(to.recipient()));
        } catch (RuntimeException e) {
            outcome = ReminderOutcome.FAILED;
            error = e.getMessage() == null ? e.toString() : e.getMessage();
            log.warn("Reminder of task {} by {} failed", due.taskNumber(), to.channel(), e);
        }
        reminders.save(new TaskReminder(due.taskId(), due.day(), to.channel(), outcome, error));
    }

    /** For the log: "+4179*****67", "h***@example.ch" – enough to tell, not a customer's data */
    static String masked(String recipient) {
        int at = recipient.indexOf('@');
        if (at > 0) {
            return recipient.charAt(0) + "***" + recipient.substring(at);
        }
        return recipient.length() <= 7 ? "***" : recipient.substring(0, 5) + "*".repeat(recipient.length() - 7) + recipient.substring(recipient.length() - 2);
    }

    /** A reminder to send: read in the transaction, sent after it */
    private record Due(UUID taskId, String taskNumber, LocalDate day, Optional<ReminderContact> contact, ReminderMessage message) {
    }

    private record Reminded(UUID taskId, LocalDate day) {
    }
}
