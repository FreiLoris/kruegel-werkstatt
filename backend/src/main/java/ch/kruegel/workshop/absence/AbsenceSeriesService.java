package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.publicholiday.ZurichPublicHolidays;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Recurring absences (FB-33): e.g. three months of external work every Mon, Tue and Thu – entered in
 * one go as single days that belong together. Public holidays are left out, so are days the person
 * has something else entered (both shown before saving). Changed or deleted per day, from a day on
 * or as a whole.
 */
@Service
@Transactional
public class AbsenceSeriesService {

    /** Longest series – about a year, like one list request */
    static final int MAX_DAYS = AbsenceService.MAX_DAYS;

    private final AbsenceRepository repository;
    private final AbsenceService absences;
    private final ZurichPublicHolidays holidays;
    private final ApplicationEventPublisher events;

    AbsenceSeriesService(AbsenceRepository repository, AbsenceService absences, ZurichPublicHolidays holidays,
                         ApplicationEventPublisher events) {
        this.repository = repository;
        this.absences = absences;
        this.holidays = holidays;
        this.events = events;
    }

    /** What the series would make – nothing saved. */
    @Transactional(readOnly = true)
    public AbsenceSeriesPlanDto plan(AbsenceSeriesRequest request) {
        Employee employee = absences.employee(request.employeeId(), null);
        AbsenceService.company(request.category(), request.company());
        return plan(request, employee);
    }

    /** Every day of the plan as an entry of its own, all with one series ID. */
    public AbsenceSeriesPlanDto create(AbsenceSeriesRequest request) {
        Employee employee = absences.employee(request.employeeId(), null);
        String company = AbsenceService.company(request.category(), request.company());
        AbsenceSeriesPlanDto plan = plan(request, employee);
        if (plan.days().isEmpty()) {
            throw new InvalidInputException("weekdays", "In diesem Zeitraum gibt es keinen freien Tag mit diesen Wochentagen");
        }
        UUID seriesId = UUID.randomUUID();
        for (LocalDate day : plan.days()) {
            repository.save(Absence.inSeries(seriesId, employee, request.category(), company, request.note(), period(request, day)));
        }
        absences.flush(employee);
        return plan;
    }

    /**
     * Category, company, note and times for the days of the scope – each keeps its day. Only the day
     * clicked needs its version (the others are changed as a whole, like a delete).
     */
    public List<AbsenceDto> update(UUID id, SeriesScope scope, AbsenceRequest request) {
        Absence clicked = find(id);
        if (scope == SeriesScope.DAY || clicked.getSeriesId() == null) {
            return List.of(absences.update(id, request));
        }
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        clicked.checkVersion(request.version());
        Employee employee = absences.employee(request.employeeId(), clicked.getEmployee());
        String company = AbsenceService.company(request.category(), request.company());
        List<Absence> days = days(clicked, scope);
        for (Absence day : days) {
            LocalDate date = day.getPeriod().startDate();
            AbsencePeriod period = AbsenceService.period(request.category(), date, request.startsAfternoon(), request.startTime(),
                    date, request.endsNoon(), request.endTime());
            absences.checkFree(employee, period, day.getId());
            day.update(employee, request.category(), company, request.note(), period);
        }
        absences.flush(employee);
        return days.stream().map(AbsenceDto::of).toList();
    }

    /** The days of the scope – e.g. "ab hier" when someone is back earlier. */
    public void delete(UUID id, SeriesScope scope) {
        Absence clicked = find(id);
        List<Absence> days = scope == SeriesScope.DAY || clicked.getSeriesId() == null ? List.of(clicked) : days(clicked, scope);
        repository.deleteAll(days);
        repository.flush();
        events.publishEvent(new DataChanged(AbsenceService.TOPIC));
    }

    private AbsenceSeriesPlanDto plan(AbsenceSeriesRequest request, Employee employee) {
        if (request.to().isBefore(request.from())) {
            throw new InvalidInputException("to", "darf nicht vor dem ersten Tag liegen");
        }
        if (ChronoUnit.DAYS.between(request.from(), request.to()) >= MAX_DAYS) {
            throw new InvalidInputException("to", "Eine Serie darf höchstens " + MAX_DAYS + " Tage umfassen");
        }
        // checks the times once – the same for every day
        period(request, request.from());

        List<Absence> existing = repository.touching(request.from(), request.to(), employee.getId());
        LocalDate firstMonday = request.from().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<LocalDate> days = new ArrayList<>();
        List<LocalDate> holidayDays = new ArrayList<>();
        List<SeriesConflictDto> conflicts = new ArrayList<>();
        for (LocalDate day = request.from(); !day.isAfter(request.to()); day = day.plusDays(1)) {
            if (!request.weekdays().contains(day.getDayOfWeek())) {
                continue;
            }
            if (request.everyOtherWeek() && ChronoUnit.WEEKS.between(firstMonday, day) % 2 != 0) {
                continue;
            }
            if (holidays.isPublicHoliday(day)) {
                holidayDays.add(day);
                continue;
            }
            AbsencePeriod period = period(request, day);
            Absence other = existing.stream().filter(a -> a.getPeriod().overlaps(period)).findFirst().orElse(null);
            if (other != null) {
                conflicts.add(new SeriesConflictDto(day, "bereits als " + AbsenceService.name(other.getCategory()) + " eingetragen"));
                continue;
            }
            days.add(day);
        }
        return new AbsenceSeriesPlanDto(days, holidayDays, conflicts);
    }

    private static AbsencePeriod period(AbsenceSeriesRequest request, LocalDate day) {
        return AbsenceService.period(request.category(), day, request.startsAfternoon(), request.startTime(),
                day, request.endsNoon(), request.endTime());
    }

    private List<Absence> days(Absence clicked, SeriesScope scope) {
        LocalDate from = scope == SeriesScope.FROM_HERE ? clicked.getPeriod().startDate() : null;
        return repository.ofSeries(clicked.getSeriesId(), from);
    }

    private Absence find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Abwesenheit", id));
    }
}
