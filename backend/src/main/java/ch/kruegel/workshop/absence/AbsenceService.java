package ch.kruegel.workshop.absence;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Absences: list a period, enter, change, delete. One person cannot be absent twice at the same
 * time (to the half day) – checked here first to say WHICH absence is in the way, the database
 * constraint catches two devices in the same second.
 */
@Service
@Transactional
public class AbsenceService {

    public static final String TOPIC = "absences";
    /** Longest period of one list request – a year with a bit around it (calendar, statistics) */
    static final int MAX_DAYS = 400;

    private static final String OVERLAP_CONSTRAINT = "absence_no_overlap";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    /** User-facing names of the categories */
    private static final Map<AbsenceCategory, String> NAMES = Map.of(
            AbsenceCategory.VACATION, "Ferien",
            AbsenceCategory.SICK, "krank",
            AbsenceCategory.EXTERNAL_WORK, "Fremdarbeit",
            AbsenceCategory.TRAINING, "Kurs");

    private final AbsenceRepository repository;
    private final EmployeeRepository employees;
    private final ApplicationEventPublisher events;

    AbsenceService(AbsenceRepository repository, EmployeeRepository employees, ApplicationEventPublisher events) {
        this.repository = repository;
        this.employees = employees;
        this.events = events;
    }

    /** Absences touching the days [from, to] (both inclusive). */
    @Transactional(readOnly = true)
    public List<AbsenceDto> between(LocalDate from, LocalDate to, UUID employeeId) {
        if (to.isBefore(from)) {
            throw new InvalidInputException("to", "darf nicht vor dem Startdatum liegen");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_DAYS) {
            throw new InvalidInputException("to", "Zeitraum darf höchstens " + MAX_DAYS + " Tage umfassen");
        }
        return repository.touching(from, to, employeeId).stream().map(AbsenceDto::of).toList();
    }

    public AbsenceDto create(AbsenceRequest request) {
        Employee employee = employee(request.employeeId(), null);
        AbsencePeriod period = period(request);
        String company = company(request);
        checkFree(employee, period, null);
        Absence absence = new Absence(employee, request.category(), company, request.note(), period);
        return saved(repository.save(absence));
    }

    public AbsenceDto update(UUID id, AbsenceRequest request) {
        if (request.version() == null) {
            throw new InvalidInputException("version", "muss beim Bearbeiten angegeben werden");
        }
        Absence absence = find(id);
        absence.checkVersion(request.version());
        Employee employee = employee(request.employeeId(), absence.getEmployee());
        AbsencePeriod period = period(request);
        String company = company(request);
        checkFree(employee, period, id);
        absence.update(employee, request.category(), company, request.note(), period);
        return saved(absence);
    }

    /** Entered by mistake – really deleted (it is history, not a message to archive). */
    public void delete(UUID id) {
        repository.delete(find(id));
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
    }

    /** A newly chosen person must be active; the person already on the absence stays valid. */
    private Employee employee(UUID id, Employee current) {
        if (current != null && current.getId().equals(id)) {
            return current;
        }
        Employee employee = employees.findById(id).orElseThrow(() -> new InvalidInputException("employeeId", "Diese Person gibt es nicht"));
        if (!employee.isActive()) {
            throw new InvalidInputException("employeeId", employee.getName() + " ist nicht mehr aktiv");
        }
        return employee;
    }

    private static AbsencePeriod period(AbsenceRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new InvalidInputException("endDate", "darf nicht vor dem ersten Tag liegen");
        }
        if (request.startDate().equals(request.endDate()) && request.startsAfternoon() && request.endsNoon()) {
            throw new InvalidInputException("endsNoon", "Ein Tag kann nicht nur Nachmittag und nur Vormittag sein");
        }
        return new AbsencePeriod(request.startDate(), request.startsAfternoon(), request.endDate(), request.endsNoon());
    }

    /** External work names the company; the others have none (an old value is dropped). */
    private static String company(AbsenceRequest request) {
        String company = request.company() == null || request.company().isBlank() ? null : request.company().strip();
        if (request.category() == AbsenceCategory.EXTERNAL_WORK && company == null) {
            throw new InvalidInputException("company", "Bei Fremdarbeit die Firma angeben");
        }
        return request.category() == AbsenceCategory.EXTERNAL_WORK ? company : null;
    }

    /** Says in words which absence is in the way – e.g. "Reto ist vom 13.10.2026 bis 16.10.2026 bereits als Ferien eingetragen". */
    private void checkFree(Employee employee, AbsencePeriod period, UUID excludeId) {
        repository.touching(period.startDate(), period.endDate(), employee.getId()).stream()
                .filter(a -> !a.getId().equals(excludeId))
                .filter(a -> a.getPeriod().overlaps(period))
                .findFirst()
                .ifPresent(other -> {
                    AbsencePeriod p = other.getPeriod();
                    String when = p.startDate().equals(p.endDate())
                            ? "am " + DAY.format(p.startDate())
                            : "vom " + DAY.format(p.startDate()) + " bis " + DAY.format(p.endDate());
                    throw new InvalidInputException("startDate", "%s ist %s bereits als %s eingetragen".formatted(
                            employee.getName(), when, NAMES.get(other.getCategory())));
                });
    }

    private Absence find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Abwesenheit", id));
    }

    /** Flush here so the overlap constraint fires inside this method and gets a friendly message. */
    private AbsenceDto saved(Absence absence) {
        try {
            repository.flush();
        } catch (DataIntegrityViolationException e) {
            if (Objects.toString(e.getMostSpecificCause().getMessage(), "").contains(OVERLAP_CONSTRAINT)) {
                throw new BusinessRuleException("Für " + absence.getEmployee().getName()
                        + " wurde gerade auf einem anderen Gerät eine Abwesenheit in dieser Zeit eingetragen. Bitte neu laden.");
            }
            throw e;
        }
        events.publishEvent(new DataChanged(TOPIC));
        return AbsenceDto.of(absence);
    }
}
