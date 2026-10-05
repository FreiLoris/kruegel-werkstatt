package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.task.TaskDto;
import ch.kruegel.workshop.task.TaskService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Task and courtesy car in ONE transaction (wizard, 7c): if the car was taken by another device in
 * the meantime, the task is not saved either – nothing half done, the user sees why and chooses
 * another car. Here in the booking package because booking depends on task, not the other way round.
 */
@Service
public class TaskWithBookingService {

    private final TaskService tasks;
    private final BookingService bookings;

    TaskWithBookingService(TaskService tasks, BookingService bookings) {
        this.tasks = tasks;
        this.bookings = bookings;
    }

    @Transactional
    public TaskWithBookingDto create(TaskWithBookingRequest request) {
        TaskDto task = tasks.create(request.task());
        var car = request.courtesyCar();
        try {
            BookingDto booking = bookings.create(
                    new BookingRequest(car.courtesyCarId(), task.id(), null, car.pickupAt(), car.returnAt(), car.notes(), null));
            return new TaskWithBookingDto(task, booking);
        } catch (InvalidInputException e) {
            // the form has the car fields under "courtesyCar."
            throw new InvalidInputException("courtesyCar." + e.getField(), e.getMessage());
        }
    }
}
