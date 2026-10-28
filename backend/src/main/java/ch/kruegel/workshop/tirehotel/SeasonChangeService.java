package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.BusinessRuleException;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.tirehotel.SeasonChangeDto.Entry;
import ch.kruegel.workshop.tirehotel.SeasonChangeDto.Group;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The season change overview (FB-21): per vehicle with a set in the hotel, whether it changed this
 * season, has an appointment, or is still to be called – and "Quittieren" for the ones not changing
 * on purpose. All-season sets do not take part.
 */
@Service
@Transactional
public class SeasonChangeService {

    private static final Set<TireSetEventKind> TAKING_OFF = Set.of(TireSetEventKind.STORED, TireSetEventKind.TAKEN_HOME, TireSetEventKind.DISPOSED);
    private static final Set<TireSetEventKind> PUTTING_ON = Set.of(TireSetEventKind.RETRIEVED, TireSetEventKind.MOUNTED);

    private final TireSetRepository sets;
    private final TaskRepository tasks;
    private final TireSeasonAckRepository acks;
    private final TireSeasonSettingsRepository settings;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    SeasonChangeService(TireSetRepository sets, TaskRepository tasks, TireSeasonAckRepository acks,
                        TireSeasonSettingsRepository settings, ApplicationEventPublisher events, Clock clock) {
        this.sets = sets;
        this.tasks = tasks;
        this.acks = acks;
        this.settings = settings;
        this.events = events;
        this.clock = clock;
    }

    /** The season around `day` (empty = today) */
    @Transactional(readOnly = true)
    public SeasonChangeDto overview(LocalDate day) {
        LocalDate today = day == null ? LocalDate.now(clock) : day;
        SeasonWindow window = window(today);
        Map<UUID, TireSeasonAck> acked = acks.findByDeadline(window.deadline()).stream()
                .collect(Collectors.toMap(a -> a.getTireSet().getId(), Function.identity()));
        // the first one per vehicle – the nearest appointment
        Map<UUID, Task> planned = tasks.openTireChangesFrom(window.from(), window.from().atStartOfDay(clock.getZone()).toInstant()).stream()
                .collect(Collectors.toMap(t -> t.getVehicle().getId(), Function.identity(), (first, second) -> first));

        Set<TireSet> candidates = new LinkedHashSet<>(sets.inHotel());
        candidates.addAll(sets.withStepsFrom(window.from()));
        // a set without vehicle is a unit of its own – "Fahrzeug noch offen" says nothing about which car
        Map<UUID, List<TireSet>> byVehicle = candidates.stream()
                .filter(s -> s.getDetails().season() != Season.ALL_SEASON)
                .collect(Collectors.groupingBy(s -> s.getVehicle() != null ? s.getVehicle().getId() : s.getId(),
                        LinkedHashMap::new, Collectors.toList()));

        List<Entry> entries = new ArrayList<>();
        byVehicle.values().forEach(unit -> entries.addAll(entriesOf(unit, window, today, acked, planned)));
        // two cars of one customer: each car's sets together
        entries.sort(Comparator.comparing((Entry e) -> e.set().customer().displayName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(e -> e.set().vehicle() == null ? e.set().id() : e.set().vehicle().id())
                .thenComparing(Entry::group));
        return new SeasonChangeDto(window.season(), window.deadline(), window.from(), window.overdue(), entries);
    }

    private static List<Entry> entriesOf(List<TireSet> unit, SeasonWindow window, LocalDate today,
                                         Map<UUID, TireSeasonAck> acked, Map<UUID, Task> planned) {
        Optional<Change> change = unit.stream()
                .flatMap(set -> set.getEvents().stream().filter(e -> isChange(set, e, window, today)).map(e -> new Change(set, e.getHappenedOn())))
                .max(Comparator.comparing(Change::day));
        List<TireSet> inHotel = unit.stream().filter(TireSet::isInHotel).toList();
        if (change.isPresent()) {
            // changed – an old set of the car still lying in the hotel is a question of its own
            List<Entry> entries = new ArrayList<>();
            entries.add(new Entry(Group.CHANGED, TireSetDto.of(change.get().set()), change.get().day(), null, null, false));
            inHotel.stream()
                    .filter(set -> set != change.get().set() && longStored(set, window))
                    .forEach(set -> entries.add(entry(set, acked.get(set.getId()) != null ? Group.ACKNOWLEDGED : Group.LONG_STORED, null, acked, false)));
            return entries;
        }
        boolean bothStored = inHotel.stream().map(s -> s.getDetails().season()).distinct().count() == 2;
        Task task = unit.getFirst().getVehicle() == null ? null : planned.get(unit.getFirst().getVehicle().getId());
        return inHotel.stream()
                .map(set -> entry(set, groupOf(set, window, task != null, acked.containsKey(set.getId())), task, acked, bothStored))
                .toList();
    }

    /** An appointment beats an acknowledgement (the customer comes after all), that one the rest */
    static Group groupOf(TireSet set, SeasonWindow window, boolean planned, boolean acknowledged) {
        if (set.getDetails().season() == window.season() && planned) {
            return Group.PLANNED;
        }
        if (acknowledged) {
            return Group.ACKNOWLEDGED;
        }
        return longStored(set, window) ? Group.LONG_STORED : Group.OPEN;
    }

    private static Entry entry(TireSet set, Group group, Task task, Map<UUID, TireSeasonAck> acked, boolean bothStored) {
        return new Entry(group, TireSetDto.of(set), null,
                group == Group.PLANNED ? plannedOf(task) : null,
                group == Group.ACKNOWLEDGED ? SeasonChangeDto.Ack.of(acked.get(set.getId())) : null,
                bothStored);
    }

    /**
     * The old set taken off, or the new one put on, within the season. Not the day a set was recorded
     * (FB-12: "on the car" or "with the customer" when it is first entered) – nothing changed then.
     */
    private static boolean isChange(TireSet set, TireSetEvent event, SeasonWindow window, LocalDate today) {
        if (event.getHappenedOn().isBefore(window.from()) || event.getHappenedOn().isAfter(today)) {
            return false;
        }
        boolean recordedThatDay = set.getEvents().stream()
                .anyMatch(e -> e.getKind() == TireSetEventKind.RECORDED && e.getHappenedOn().equals(event.getHappenedOn()));
        Season season = set.getDetails().season();
        return !recordedThatDay && (season == window.other() ? TAKING_OFF.contains(event.getKind()) : PUTTING_ON.contains(event.getKind()));
    }

    /**
     * In the hotel through a deadline of its own season: the old set since before the season began,
     * the new one since before its deadline a year ago.
     */
    private static boolean longStored(TireSet set, SeasonWindow window) {
        LocalDate lastOwnDeadline = set.getDetails().season() == window.other() ? window.from() : window.deadline().minusYears(1);
        return set.getStoredOn() != null && set.getStoredOn().isBefore(lastOwnDeadline);
    }

    private static SeasonChangeDto.PlannedTask plannedOf(Task task) {
        LocalDate date = task.getAppointment() == null ? null : task.getAppointment().date();
        return new SeasonChangeDto.PlannedTask(task.getId(), task.getTaskNumber(), date);
    }

    private record Change(TireSet set, LocalDate day) {
    }

    /** Not changed in the season shown on purpose – for that season only */
    public SeasonChangeDto.Ack acknowledge(TireSeasonAckRequest request) {
        TireSet set = sets.findById(request.tireSetId()).orElseThrow(() -> new NotFoundException("Satz", request.tireSetId()));
        LocalDate deadline = window(LocalDate.now(clock)).deadline();
        // User-facing messages, hence German
        if (!request.deadline().equals(deadline)) {
            throw new BusinessRuleException("Inzwischen gilt eine andere Saison – bitte die Seite neu laden.");
        }
        if (!set.isInHotel() || set.getDetails().season() == Season.ALL_SEASON) {
            throw new BusinessRuleException("Quittiert werden nur Sommer- und Wintersätze im Pneuhotel.");
        }
        if (acks.existsByTireSetIdAndDeadline(set.getId(), deadline)) {
            throw new BusinessRuleException("Dieser Satz ist für diese Saison schon quittiert.");
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().strip();
        TireSeasonAck ack = acks.saveAndFlush(new TireSeasonAck(set, deadline, reason));
        events.publishEvent(new DataChanged(TireHotelService.TOPIC));
        return SeasonChangeDto.Ack.of(ack);
    }

    public void undoAcknowledge(UUID id) {
        TireSeasonAck ack = acks.findById(id).orElseThrow(() -> new NotFoundException("Quittierung", id));
        acks.delete(ack);
        events.publishEvent(new DataChanged(TireHotelService.TOPIC));
    }

    @Transactional(readOnly = true)
    public TireSeasonSettingsDto settings() {
        return TireSeasonSettingsDto.of(theSettings());
    }

    public TireSeasonSettingsDto updateSettings(TireSeasonSettingsRequest request) {
        TireSeasonSettings current = theSettings();
        current.checkVersion(request.version());
        MonthDay summer = deadline(request.summerDeadline(), "summerDeadline");
        MonthDay winter = deadline(request.winterDeadline(), "winterDeadline");
        if (daysApart(summer, winter) < MIN_DAYS_APART) {
            throw new InvalidInputException("winterDeadline", "muss mindestens zwei Monate vom Stichtag für Sommerreifen entfernt sein");
        }
        LocalDate today = LocalDate.now(clock);
        SeasonWindow before = window(today);
        current.update(summer, winter);
        settings.flush();
        // the season shown keeps its acknowledgements – only its day moved
        SeasonWindow after = window(today);
        if (after.season() == before.season() && !after.deadline().equals(before.deadline())) {
            acks.moveDeadline(before.deadline(), after.deadline());
        }
        events.publishEvent(new DataChanged(TireHotelService.SETTINGS_TOPIC));
        // another deadline – another overview
        events.publishEvent(new DataChanged(TireHotelService.TOPIC));
        return TireSeasonSettingsDto.of(current);
    }

    /** Closer together the season shown would flip back and forth */
    private static final int MIN_DAYS_APART = 60;

    /** Days between two days of the year, around the turn of the year too */
    private static long daysApart(MonthDay a, MonthDay b) {
        long days = Math.abs(ChronoUnit.DAYS.between(a.atYear(2001), b.atYear(2001)));
        return Math.min(days, 365 - days);
    }

    /** "06-01" → 1 June; 29 February is not there every year */
    private static MonthDay deadline(String text, String field) {
        try {
            MonthDay day = MonthDay.parse(text, TireSeasonSettings.FORMAT);
            if (day.equals(MonthDay.of(2, 29))) {
                throw new InvalidInputException(field, "der 29. Februar ist nicht jedes Jahr – bitte einen anderen Tag");
            }
            return day;
        } catch (DateTimeException e) {
            throw new InvalidInputException(field, "ist kein Tag im Jahr");
        }
    }

    private SeasonWindow window(LocalDate day) {
        TireSeasonSettings s = theSettings();
        return SeasonWindow.at(day, s.getSummerDeadline(), s.getWinterDeadline());
    }

    private TireSeasonSettings theSettings() {
        return settings.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Season change settings missing – migration V46 creates them"));
    }
}
