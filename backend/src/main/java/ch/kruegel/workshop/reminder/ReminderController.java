package ch.kruegel.workshop.reminder;

import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** What the reminders did (17d): per task, and whom to call for a day. */
@RestController
@RequestMapping("/api/reminders")
@Tag(name = "Reminders")
class ReminderController {

    private final TaskReminderRepository reminders;
    private final TaskRepository tasks;

    ReminderController(TaskReminderRepository reminders, TaskRepository tasks) {
        this.reminders = reminders;
        this.tasks = tasks;
    }

    @Operation(summary = "The reminders of a task, the latest first")
    @GetMapping
    @Transactional(readOnly = true)
    List<ReminderDto> ofTask(@RequestParam UUID taskId) {
        return reminders.findByTaskIdOrderByCreatedAtDesc(taskId).stream().map(ReminderDto::of).toList();
    }

    @Operation(summary = "Whom to call for a day", description = "Customers to bring their car that day who got no SMS: "
            + "no mobile number, the SMS failed, or SMS not set up. Known from the run the working day before.")
    @GetMapping("/to-call")
    @Transactional(readOnly = true)
    List<ToCallDto> toCall(@RequestParam LocalDate date) {
        List<TaskReminder> missed = reminders.findByDropOffDateBetween(date, date).stream()
                .filter(r -> r.getOutcome() != ReminderOutcome.SENT)
                .toList();
        Map<UUID, Task> byId = tasks.findByIdIn(missed.stream().map(TaskReminder::getTaskId).toList()).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        return missed.stream()
                .filter(r -> byId.containsKey(r.getTaskId()))
                .map(r -> {
                    Task task = byId.get(r.getTaskId());
                    CustomerDetails customer = task.getCustomer().getDetails();
                    String phone = customer.mobile() != null ? customer.mobile() : customer.phone();
                    return new ToCallDto(task.getId(), task.getTaskNumber(), task.getCustomer().getId(), customer.displayName(), phone,
                            r.getOutcome(), r.getError());
                })
                .sorted(Comparator.comparing(ToCallDto::customerName))
                .toList();
    }
}
