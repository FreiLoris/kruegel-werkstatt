package ch.kruegel.workshop.reminder;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** What the reminders did (17d): for a task, and whom to call for a day. */
@RestController
@RequestMapping("/api/reminders")
@Tag(name = "Reminders")
class ReminderController {

    private final ReminderOutcomeService service;

    ReminderController(ReminderOutcomeService service) {
        this.service = service;
    }

    @Operation(summary = "The reminder of a task for its current drop-off day",
            description = "Empty before the run the working day before – or when the task is not to be reminded.")
    @GetMapping
    List<ReminderDto> ofTask(@RequestParam UUID taskId) {
        return service.ofTask(taskId);
    }

    @Operation(summary = "Whom to call for a day", description = "Customers to bring their car that day who got no SMS: "
            + "no mobile number, the SMS failed, or SMS not set up – and who are still to come.")
    @GetMapping("/to-call")
    List<ToCallDto> toCall(@RequestParam LocalDate date) {
        return service.toCall(date);
    }
}
