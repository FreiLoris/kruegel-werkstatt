package ch.kruegel.workshop.statistics;

import ch.kruegel.workshop.absence.AbsenceStatisticsDto.PersonStatisticsDto;
import ch.kruegel.workshop.absence.AbsenceStatisticsService;
import ch.kruegel.workshop.statistics.StatisticsRepository.Text;
import ch.kruegel.workshop.statistics.TeamStatisticsDto.BirthdayDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToDoubleFunction;

/**
 * Counts everything for the statistics page (15a) – the SQL is in {@link StatisticsRepository}, here
 * the numbers are put together. Read only; one call counts all – the page is opened now and then,
 * not every second, so no caching.
 *
 * <p>Inactive customers, vehicles and people are left out; tasks count however old they are.
 */
@Service
@Transactional(readOnly = true)
public class StatisticsService {

    private final StatisticsRepository db;
    private final AbsenceStatisticsService absences;
    private final Clock clock;

    StatisticsService(StatisticsRepository db, AbsenceStatisticsService absences, Clock clock) {
        this.db = db;
        this.absences = absences;
        this.clock = clock;
    }

    public StatisticsDto all() {
        LocalDate today = LocalDate.now(clock);
        return new StatisticsDto(today, tasks(today), vehicles(today), customers(today), tires(today), team(today), material(today));
    }

    private TaskStatisticsDto tasks(LocalDate today) {
        LocalDate month = today.withDayOfMonth(1);
        LocalDate year = today.withDayOfYear(1);
        return new TaskStatisticsDto(
                db.tasks(),
                db.tasksBetween(year, year.plusYears(1)),
                db.tasksBetween(month, month.plusMonths(1)),
                db.tasksDone(),
                db.tasksWaitingCustomer(),
                db.tasksWithTireChange(),
                db.tasksWithMfk(),
                db.firstAppointment(),
                db.tasksPerMonth(month.minusMonths(11), month),
                db.tasksPerWeekday(),
                db.tasksPerHour(),
                db.tasksByStatus(),
                db.serviceItems(),
                db.tasksPerLift(),
                db.tasksPerMechanic(),
                db.tasksPerAcceptedBy(),
                db.regulars(),
                db.busiestDay(),
                rounded(db.averageTaskMinutes()));
    }

    private VehicleStatisticsDto vehicles(LocalDate today) {
        return new VehicleStatisticsDto(
                db.vehicles(),
                db.topTexts(Text.MAKE),
                db.models(),
                db.topTexts(Text.COLOR),
                db.topTexts(Text.FUEL),
                db.cantons(),
                db.averageVehicleAgeYears(today),
                db.oldestVehicle(),
                db.mostKmVehicle(),
                db.totalKm(),
                db.vehiclesWithMileage());
    }

    private CustomerStatisticsDto customers(LocalDate today) {
        return new CustomerStatisticsDto(
                db.customers(),
                db.companies(),
                db.customersSince(today.withDayOfYear(1)),
                db.customersWithEmail(),
                db.customersWithMobile(),
                db.topTexts(Text.CITY),
                db.topTexts(Text.FIRST_NAME),
                db.customerSources());
    }

    private TireStatisticsDto tires(LocalDate today) {
        return new TireStatisticsDto(
                db.tireSets(),
                db.tireStates(),
                db.tireSeasonsInHotel(),
                db.tireKindsInHotel(),
                db.topTexts(Text.TIRE_BRAND),
                db.topTexts(Text.TIRE_DIMENSION),
                db.averageDepthInHotel(),
                db.oldestTireYearInHotel(),
                db.tireEventsSince(today.withDayOfYear(1)));
    }

    private TeamStatisticsDto team(LocalDate today) {
        // the same counting as the absence statistics (9c): working days, half days as 0.5
        List<PersonStatisticsDto> people = absences.forYear(today.getYear()).people();
        return new TeamStatisticsDto(
                db.employees(),
                nextBirthday(today),
                sum(people, PersonStatisticsDto::vacationTaken),
                sum(people, PersonStatisticsDto::sickDays),
                sum(people, PersonStatisticsDto::trainingDays),
                sum(people, PersonStatisticsDto::externalWorkDays),
                db.todosOpen(),
                db.todosDone(),
                db.todoChampion(),
                db.notesOnPinboard());
    }

    /** Today counts as next – "heute hat … Geburtstag" is the best moment for the page */
    private BirthdayDto nextBirthday(LocalDate today) {
        return db.birthdays().stream()
                .map(person -> {
                    LocalDate date = nextOccurrence(person.getValue(), today);
                    return new BirthdayDto(person.getKey(), date, date.getYear() - person.getValue().getYear());
                })
                .min(Comparator.comparing(BirthdayDto::date))
                .orElse(null);
    }

    /** 29 February is celebrated on 28 February in a common year (MonthDay.atYear does that) */
    static LocalDate nextOccurrence(LocalDate birthday, LocalDate today) {
        MonthDay day = MonthDay.from(birthday);
        LocalDate thisYear = day.atYear(today.getYear());
        return thisYear.isBefore(today) ? day.atYear(today.getYear() + 1) : thisYear;
    }

    private MaterialStatisticsDto material(LocalDate today) {
        return new MaterialStatisticsDto(
                db.shoppingItems(),
                db.shoppingStatus(),
                db.suppliers(),
                db.averageDeliveryDays(),
                db.stockItems(),
                db.stockQuantity(),
                db.stockCategories(),
                db.courtesyBookings(),
                db.courtesyCars(),
                db.courtesyDays(today));
    }

    private static Long rounded(Double value) {
        return value == null ? null : Math.round(value);
    }

    private static double sum(List<PersonStatisticsDto> people, ToDoubleFunction<PersonStatisticsDto> days) {
        return people.stream().mapToDouble(days).sum();
    }
}
