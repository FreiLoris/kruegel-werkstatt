package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.company.CompanyDto;
import ch.kruegel.workshop.company.CompanyService;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.ReminderChannel;
import ch.kruegel.workshop.customer.ReminderContact;
import ch.kruegel.workshop.publicholiday.ZurichPublicHolidays;
import ch.kruegel.workshop.task.Appointment;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.task.TaskStatus;
import ch.kruegel.workshop.task.VehicleLocation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.UUID;

/**
 * Reminds customers of their appointments (17a): on a working day, from the set time on, every
 * customer who is to bring the car before the next working day – on Friday also for Saturday to
 * Monday. An SMS, else an e-mail; once per task and day. Nothing could be sent: that is kept too,
 * someone has to call.
 *
 * <p>Not reminded: a task taken off ("nicht erinnern"), a customer who wants none, a car already
 * here or a task started or done, and a task taken today – the customer just spoke to us.
 */
@Service
public class ReminderService {

    public static final String TOPIC = "reminder-settings";

    /** Not later in the evening – a task planned after that is not reminded */
    static final LocalTime SEND_UNTIL = LocalTime.of(20, 0);

    /** A car that comes earlier comes at most this many days before its appointment */
    private static final int EARLIER_DAYS = 7;

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final ReminderSettingsRepository settings;
    private final TaskReminderRepository reminders;
    private final TaskRepository tasks;
    private final ZurichPublicHolidays holidays;
    private final CompanyService company;
    private final Map<ReminderChannel, ReminderSender> senders = new EnumMap<>(ReminderChannel.class);
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transaction;
    private final Clock clock;

    ReminderService(ReminderSettingsRepository settings, TaskReminderRepository reminders, TaskRepository tasks,
                    ZurichPublicHolidays holidays, CompanyService company, List<ReminderSender> senders,
                    ApplicationEventPublisher events, PlatformTransactionManager transactions, Clock clock) {
        this.settings = settings;
        this.reminders = reminders;
        this.tasks = tasks;
        this.holidays = holidays;
        this.company = company;
        senders.forEach(sender -> this.senders.put(sender.channel(), sender));
        this.events = events;
        this.transaction = new TransactionTemplate(transactions);
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ReminderSettingsDto settings() {
        return dto(theSettings());
    }

    @Transactional
    public ReminderSettingsDto updateSettings(ReminderSettingsRequest request) {
        ReminderSettings current = theSettings();
        current.checkVersion(request.version());
        if (request.sendTime().isBefore(ReminderSettings.EARLIEST) || request.sendTime().isAfter(ReminderSettings.LATEST)) {
            throw new InvalidInputException("sendTime", "muss zwischen 08:00 und 19:00 liegen");
        }
        current.update(request.enabled(), request.sendTime());
        settings.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return dto(current);
    }

    /** Called by {@link ReminderJob} every few minutes: whoever is due now is reminded. */
    public void remindDue() {
        remindDue(LocalDateTime.now(clock));
    }

    void remindDue(LocalDateTime now) {
        // read in one go; each one sent and kept on its own – a provider that fails stops nothing else
        List<Due> due = transaction.execute(status -> due(now));
        due.forEach(this::remind);
    }

    private List<Due> due(LocalDateTime now) {
        ReminderSettings current = theSettings();
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
        CompanyDto workshop = company.get();
        List<Due> result = new ArrayList<>();
        for (Task task : tasks.findByAppointmentDateBetween(first, last.plusDays(EARLIER_DAYS), Sort.unsorted())) {
            Appointment appointment = task.getAppointment();
            boolean earlier = appointment.arrivesEarlier() != null;
            LocalDateTime dropOff = earlier ? appointment.arrivesEarlier() : appointment.date().atTime(appointment.time());
            LocalDate day = dropOff.toLocalDate();
            if (day.isBefore(first) || day.isAfter(last) || !toRemind(task, today) || reminders.existsByTaskIdAndDropOffDate(task.getId(), day)) {
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

    private boolean toRemind(Task task, LocalDate today) {
        return task.isRemindCustomer()
                && !task.getCustomer().isNoReminders()
                && (task.getStatus() == TaskStatus.RECEIVED || task.getStatus() == TaskStatus.WAITING_FOR_PARTS)
                && task.getVehicleLocation() == VehicleLocation.AT_CUSTOMER
                && !LocalDate.ofInstant(task.getCreatedAt(), clock.getZone()).equals(today);
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
        try {
            sender.send(to, due.message());
            log.info("Reminder of task {} sent by {} to {}", due.taskNumber(), to.channel(), masked(to.recipient()));
            reminders.save(new TaskReminder(due.taskId(), due.day(), to.channel(), ReminderOutcome.SENT, null));
        } catch (RuntimeException e) {
            log.warn("Reminder of task {} by {} failed: {}", due.taskNumber(), to.channel(), e.getMessage());
            reminders.save(new TaskReminder(due.taskId(), due.day(), to.channel(), ReminderOutcome.FAILED, e.getMessage()));
        }
    }

    /** For the log: "+4179*****67", "h***@example.ch" – enough to tell, not a customer's data */
    static String masked(String recipient) {
        int at = recipient.indexOf('@');
        if (at > 0) {
            return recipient.charAt(0) + "***" + recipient.substring(at);
        }
        return recipient.length() <= 7 ? "***" : recipient.substring(0, 5) + "*".repeat(recipient.length() - 7) + recipient.substring(recipient.length() - 2);
    }

    private ReminderSettingsDto dto(ReminderSettings s) {
        return new ReminderSettingsDto(s.getVersion(), s.isEnabled(), s.getSendTime(),
                senders.containsKey(ReminderChannel.SMS), senders.containsKey(ReminderChannel.EMAIL));
    }

    private ReminderSettings theSettings() {
        return settings.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Reminder settings missing – migration V57 creates them"));
    }

    /** A reminder to send: read in the transaction, sent after it */
    private record Due(UUID taskId, String taskNumber, LocalDate day, Optional<ReminderContact> contact, ReminderMessage message) {
    }
}
