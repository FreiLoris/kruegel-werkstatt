package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.publicholiday.ZurichPublicHolidays;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Counts the absences of a year on the server (9c) – one place for the rule instead of the
 * browser: working days only, half days as half, an absence over New Year split between the years.
 */
@Service
@Transactional(readOnly = true)
public class AbsenceStatisticsService {

    static final int FIRST_YEAR = 2000;
    static final int LAST_YEAR = 2100;

    private final AbsenceRepository absences;
    private final EmployeeRepository employees;
    private final ZurichPublicHolidays holidays;
    private final Clock clock;

    AbsenceStatisticsService(AbsenceRepository absences, EmployeeRepository employees, ZurichPublicHolidays holidays, Clock clock) {
        this.absences = absences;
        this.employees = employees;
        this.holidays = holidays;
        this.clock = clock;
    }

    public AbsenceStatisticsDto forYear(int year) {
        if (year < FIRST_YEAR || year > LAST_YEAR) {
            throw new InvalidInputException("year", "muss zwischen " + FIRST_YEAR + " und " + LAST_YEAR + " liegen");
        }
        LocalDate firstDay = LocalDate.of(year, 1, 1);
        LocalDate lastDay = LocalDate.of(year, 12, 31);
        // vacation after today is "planned"; in a past year nothing is, in a future year everything
        LocalDate plannedFrom = LocalDate.now(clock).plusDays(1);

        // half days per person and category – whole numbers, no rounding anywhere
        Map<UUID, Map<AbsenceCategory, Integer>> halves = new HashMap<>();
        Map<UUID, Integer> plannedVacation = new HashMap<>();
        Map<String, CompanyCount> companies = new LinkedHashMap<>();
        for (Absence absence : absences.touching(firstDay, lastDay, null)) {
            UUID employeeId = absence.getEmployee().getId();
            AbsencePeriod period = absence.getPeriod();
            int count = period.workingHalfDays(firstDay, lastDay, holidays::isWorkingDay);
            halves.computeIfAbsent(employeeId, id -> new EnumMap<>(AbsenceCategory.class)).merge(absence.getCategory(), count, Integer::sum);
            if (absence.getCategory() == AbsenceCategory.VACATION) {
                LocalDate from = plannedFrom.isAfter(firstDay) ? plannedFrom : firstDay;
                plannedVacation.merge(employeeId, period.workingHalfDays(from, lastDay, holidays::isWorkingDay), Integer::sum);
            }
            if (absence.getCategory() == AbsenceCategory.EXTERNAL_WORK) {
                // "Garage Muster AG" and "garage muster ag" are the same company
                String key = absence.getCompany().strip().toLowerCase(Locale.ROOT);
                companies.computeIfAbsent(key, k -> new CompanyCount(absence.getCompany().strip())).add(count, employeeId);
            }
        }

        List<Employee> everyone = employees.findAllByOrderBySortOrderAscNameAsc();
        List<AbsenceStatisticsDto.PersonStatisticsDto> people = everyone.stream()
                .filter(e -> e.isActive() || halves.containsKey(e.getId()))
                .map(e -> person(e, halves.getOrDefault(e.getId(), Map.of()), plannedVacation.getOrDefault(e.getId(), 0)))
                .toList();
        List<UUID> order = everyone.stream().map(Employee::getId).toList();
        List<AbsenceStatisticsDto.CompanyStatisticsDto> companyList = companies.values().stream()
                .sorted(Comparator.comparingInt(CompanyCount::halves).reversed()
                        .thenComparing(CompanyCount::name, String.CASE_INSENSITIVE_ORDER))
                .map(c -> c.toDto(order))
                .toList();
        return new AbsenceStatisticsDto(year, people, companyList);
    }

    private static AbsenceStatisticsDto.PersonStatisticsDto person(Employee employee, Map<AbsenceCategory, Integer> halves, int plannedVacationHalves) {
        int vacation = halves.getOrDefault(AbsenceCategory.VACATION, 0);
        int entitlement = employee.getVacationDaysPerYear();
        return new AbsenceStatisticsDto.PersonStatisticsDto(
                employee.getId(),
                employee.getName(),
                employee.isActive(),
                entitlement,
                days(vacation - plannedVacationHalves),
                days(plannedVacationHalves),
                entitlement - days(vacation),
                days(halves.getOrDefault(AbsenceCategory.SICK, 0)),
                days(halves.getOrDefault(AbsenceCategory.TRAINING, 0)),
                days(halves.getOrDefault(AbsenceCategory.EXTERNAL_WORK, 0)));
    }

    /** Half days → days; exact in a double (x.0 or x.5) */
    private static double days(int halves) {
        return halves / 2.0;
    }

    /** Counting one company while going through the absences */
    private static final class CompanyCount {
        private final String name;
        private int halves;
        private int assignments;
        private final Set<UUID> employeeIds = new LinkedHashSet<>();

        CompanyCount(String name) {
            this.name = name;
        }

        void add(int halfDays, UUID employeeId) {
            halves += halfDays;
            assignments++;
            employeeIds.add(employeeId);
        }

        String name() {
            return name;
        }

        int halves() {
            return halves;
        }

        AbsenceStatisticsDto.CompanyStatisticsDto toDto(List<UUID> order) {
            List<UUID> who = new ArrayList<>(employeeIds);
            who.sort(Comparator.comparingInt(order::indexOf));
            return new AbsenceStatisticsDto.CompanyStatisticsDto(name, days(halves), assignments, who);
        }
    }
}
