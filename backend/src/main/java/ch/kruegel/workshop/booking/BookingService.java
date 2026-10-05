package ch.kruegel.workshop.booking;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarRepository;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Courtesy car bookings: THE availability check (wizard, task and courtesy car page use the same
 * one – bug #2), booking, moving, cancelling, recording the return.
 *
 * <p>Overlaps are checked here first to say WHICH booking is in the way; the database constraint
 * (V13) catches what slips through between check and save (two devices at the same moment).
 */
@Service
@Transactional
public class BookingService {

    public static final String TOPIC = "courtesy-car-bookings";
    /** Longest period of one list or availability request */
    static final int MAX_DAYS = 92;

    private static final String OVERLAP_CONSTRAINT = "courtesy_car_booking_no_overlap";
    // user-facing, hence German format
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final CourtesyCarBookingRepository repository;
    private final CourtesyCarRepository cars;
    private final TaskRepository tasks;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    BookingService(CourtesyCarBookingRepository repository, CourtesyCarRepository cars, TaskRepository tasks,
                   ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.cars = cars;
        this.tasks = tasks;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<BookingDto> inPeriod(LocalDateTime from, LocalDateTime to) {
        checkQueryPeriod(from, to);
        return repository.inPeriod(from, to).stream().map(BookingDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDto> ofTask(UUID taskId) {
        return repository.findByTaskIdOrderByPeriodPickupAt(taskId).stream().map(BookingDto::of).toList();
    }

    /**
     * Every courtesy car in service with "free" or the bookings in the way – and whether it is still
     * out although it should be back (overdue: the planned period is free, but the car may not be there).
     *
     * @param excludeBookingId a booking that is being moved – it does not count against itself
     */
    @Transactional(readOnly = true)
    public List<AvailabilityDto> availability(LocalDateTime from, LocalDateTime to, UUID excludeBookingId) {
        checkQueryPeriod(from, to);
        BookingPeriod period = new BookingPeriod(from, to);
        LocalDateTime now = LocalDateTime.now(clock);
        return cars.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(car -> {
                    List<BookingDto> conflicts = repository.blocking(car.getId(), period.pickupAt(), period.returnAt(), excludeBookingId)
                            .stream().map(BookingDto::of).toList();
                    BookingDto overdue = repository
                            .findByCourtesyCarIdAndReturnedAtIsNullAndPeriodReturnAtLessThanEqualOrderByPeriodReturnAt(car.getId(), now)
                            .stream().findFirst().map(BookingDto::of).orElse(null);
                    return new AvailabilityDto(car.getId(), car.getName(), car.getModel(), car.getLicensePlate(),
                            conflicts.isEmpty(), conflicts, overdue);
                })
                .toList();
    }

    public BookingDto create(BookingRequest request) {
        CourtesyCar car = car(request.courtesyCarId(), null);
        BookingPeriod period = period(request.pickupAt(), request.returnAt());
        CourtesyCarBooking booking;
        if (request.taskId() != null) {
            Task task = tasks.findById(request.taskId())
                    .orElseThrow(() -> new InvalidInputException("taskId", "Diesen Auftrag gibt es nicht"));
            booking = CourtesyCarBooking.forTask(car, task, period, request.notes());
        } else {
            if (request.holder() == null || request.holder().isBlank()) {
                throw new InvalidInputException("holder", "Wer bekommt das Auto? Name angeben oder Auftrag wählen");
            }
            booking = CourtesyCarBooking.forHolder(car, request.holder(), period, request.notes());
        }
        checkFree(car, period, null);
        return saved(repository.save(booking));
    }

    /** Another car, period or notes – the task/holder stays. */
    public BookingDto update(UUID id, BookingRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        CourtesyCarBooking booking = find(id);
        booking.checkVersion(request.version());
        CourtesyCar car = car(request.courtesyCarId(), booking.getCourtesyCar());
        BookingPeriod period = period(request.pickupAt(), request.returnAt());
        if (booking.getReturnedAt() != null && booking.getReturnedAt().isBefore(period.pickupAt())) {
            throw new InvalidInputException("pickupAt", "liegt nach der erfassten Rückgabe");
        }
        checkFree(car, period, id);

        booking.reschedule(car, period);
        booking.changeNotes(request.notes());
        return saved(booking);
    }

    /** The car is back – at the given time or now. An early return frees the car from then on. */
    public BookingDto recordReturn(UUID id, LocalDateTime at) {
        CourtesyCarBooking booking = find(id);
        LocalDateTime returnedAt = at != null ? at : LocalDateTime.now(clock);
        if (returnedAt.isBefore(booking.getPeriod().pickupAt())) {
            throw new InvalidInputException("returnedAt", "kann nicht vor der Abholung liegen");
        }
        booking.recordReturn(returnedAt);
        return saved(booking);
    }

    /** Return recorded by mistake – only possible while nobody booked the freed time. */
    public BookingDto undoReturn(UUID id) {
        CourtesyCarBooking booking = find(id);
        checkFree(booking.getCourtesyCar(), booking.getPeriod(), id);
        booking.undoReturn();
        return saved(booking);
    }

    public void cancel(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }

    /** Newly chosen car must be in service; the car already on the booking stays valid. */
    private CourtesyCar car(UUID id, CourtesyCar current) {
        if (current != null && current.getId().equals(id)) {
            return current;
        }
        CourtesyCar car = cars.findById(id).orElseThrow(() -> new InvalidInputException("courtesyCarId", "Diesen Ersatzwagen gibt es nicht"));
        if (!car.isActive()) {
            throw new InvalidInputException("courtesyCarId", car.getName() + " ist ausser Betrieb");
        }
        return car;
    }

    private static BookingPeriod period(LocalDateTime pickupAt, LocalDateTime returnAt) {
        if (!returnAt.isAfter(pickupAt)) {
            throw new InvalidInputException("returnAt", "muss nach der Abholung liegen");
        }
        return new BookingPeriod(pickupAt, returnAt);
    }

    /** The period of a list or availability request – errors at the query field "to". */
    private static void checkQueryPeriod(LocalDateTime from, LocalDateTime to) {
        if (!to.isAfter(from)) {
            throw new InvalidInputException("to", "muss nach dem Beginn liegen");
        }
        if (LocalDate.from(to).isAfter(LocalDate.from(from).plusDays(MAX_DAYS))) {
            throw new InvalidInputException("to", "Zeitraum darf höchstens " + MAX_DAYS + " Tage umfassen");
        }
    }

    /** Says in words which booking is in the way – the user can then choose another car or time. */
    private void checkFree(CourtesyCar car, BookingPeriod period, UUID excludeId) {
        List<CourtesyCarBooking> blocking = repository.blocking(car.getId(), period.pickupAt(), period.returnAt(), excludeId);
        if (!blocking.isEmpty()) {
            CourtesyCarBooking first = blocking.getFirst();
            throw new BusinessRuleException("%s ist vom %s bis %s an %s vergeben.".formatted(
                    car.getName(), WHEN.format(first.getPeriod().pickupAt()), WHEN.format(first.blockedUntil()),
                    BookingDto.of(first).holderName()));
        }
    }

    private CourtesyCarBooking find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Buchung", id));
    }

    /**
     * Flush here so the database constraint fires inside this method: two devices booking the
     * same car in the same second → the second one gets the friendly message, not a generic 409.
     */
    private BookingDto saved(CourtesyCarBooking booking) {
        try {
            repository.flush();
        } catch (DataIntegrityViolationException e) {
            if (Objects.toString(e.getMostSpecificCause().getMessage(), "").contains(OVERLAP_CONSTRAINT)) {
                throw new BusinessRuleException(booking.getCourtesyCar().getName()
                        + " wurde gerade auf einem anderen Gerät für diese Zeit vergeben. Bitte Verfügbarkeit neu laden.");
            }
            throw e;
        }
        events.publishEvent(new DataChanged(TOPIC));
        return BookingDto.of(booking);
    }
}
