package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Collator;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * What the reminders did (17d) – always against the task as it is now: a task moved to another day,
 * done, untaken or with its car already here leaves the old day's reminder behind.
 */
@Service
@Transactional(readOnly = true)
public class ReminderOutcomeService {

    private final TaskReminderRepository reminders;
    private final TaskRepository tasks;

    ReminderOutcomeService(TaskReminderRepository reminders, TaskRepository tasks) {
        this.reminders = reminders;
        this.tasks = tasks;
    }

    /** The reminder for the task's current drop-off day – empty before the run or without one */
    public List<ReminderDto> ofTask(UUID taskId) {
        return tasks.findById(taskId)
                .filter(task -> task.isRemindCustomer() && task.getAppointment().isPlanned())
                .flatMap(task -> reminders.findByTaskIdAndDropOffDate(taskId, ReminderService.dropOff(task.getAppointment()).toLocalDate()))
                .map(ReminderDto::of)
                .stream()
                .toList();
    }

    /** Customers to bring their car that day who got no SMS and are still to come – sorted by name */
    public List<ToCallDto> toCall(LocalDate date) {
        Map<UUID, TaskReminder> missed = reminders.findByDropOffDate(date).stream()
                .filter(r -> r.getOutcome() != ReminderOutcome.SENT)
                .collect(Collectors.toMap(TaskReminder::getTaskId, Function.identity()));
        Collator byName = Collator.getInstance(Locale.GERMAN);
        // the tasks still due that day – the same rule as the run
        return tasks.toRemind(date, date).stream()
                .filter(task -> missed.containsKey(task.getId()))
                .map(task -> {
                    TaskReminder reminder = missed.get(task.getId());
                    CustomerDetails customer = task.getCustomer().getDetails();
                    return new ToCallDto(task.getId(), task.getTaskNumber(), task.getCustomer().getId(), customer.displayName(),
                            customer.mobile(), customer.phone(), reminder.getOutcome(), reminder.getError());
                })
                .sorted(Comparator.comparing(ToCallDto::customerName, byName))
                .toList();
    }
}
