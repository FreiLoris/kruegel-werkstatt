package ch.kruegel.workshop.common.dev;

import ch.kruegel.workshop.courtesycar.CourtesyCar;
import ch.kruegel.workshop.courtesycar.CourtesyCarDetails;
import ch.kruegel.workshop.courtesycar.CourtesyCarRepository;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeDetails;
import ch.kruegel.workshop.employee.EmployeeRepository;
import ch.kruegel.workshop.employee.Role;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.lift.LiftRepository;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.serviceitem.ServiceItemRepository;
import ch.kruegel.workshop.note.Note;
import ch.kruegel.workshop.note.NoteDetails;
import ch.kruegel.workshop.note.NoteRepository;
import ch.kruegel.workshop.task.Appointment;
import ch.kruegel.workshop.task.PartsOrder;
import ch.kruegel.workshop.task.PartsStatus;
import ch.kruegel.workshop.task.Task;
import ch.kruegel.workshop.task.TaskDetails;
import ch.kruegel.workshop.task.TaskRepository;
import ch.kruegel.workshop.task.TaskStatus;
import ch.kruegel.workshop.task.TaskWork;
import ch.kruegel.workshop.todo.Todo;
import ch.kruegel.workshop.todo.TodoDetails;
import ch.kruegel.workshop.todo.TodoRepository;
import ch.kruegel.workshop.task.TireChangeKind;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Sample data for local development – ONLY in the Spring profile "dev"
 * (automatic with {@code ./mvnw spring-boot:run}, never in the Docker image, never in tests).
 *
 * <p>Java on purpose instead of a Flyway migration: the Flyway history should only contain the
 * real schema. Otherwise an installation without sample data (Docker, NAS) would refuse to start
 * as soon as it meets a database in which the sample data migration is recorded.
 * Also, the sample data goes through the same validation as real input.
 *
 * <p>Each table is only filled if it is empty – your own changes are kept, and a table added
 * later still gets sample data in an existing development database.
 */
@Component
@Profile("dev")
class DevSampleData implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSampleData.class);

    private final EmployeeRepository employees;
    private final CourtesyCarRepository courtesyCars;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final LiftRepository lifts;
    private final ServiceItemRepository serviceItems;
    private final TaskRepository tasks;
    private final TodoRepository todos;
    private final NoteRepository notes;
    private final Clock clock;

    DevSampleData(EmployeeRepository employees, CourtesyCarRepository courtesyCars, CustomerRepository customers,
                  VehicleRepository vehicles, LiftRepository lifts, ServiceItemRepository serviceItems,
                  TaskRepository tasks, TodoRepository todos, NoteRepository notes, Clock clock) {
        this.employees = employees;
        this.courtesyCars = courtesyCars;
        this.customers = customers;
        this.vehicles = vehicles;
        this.lifts = lifts;
        this.serviceItems = serviceItems;
        this.tasks = tasks;
        this.todos = todos;
        this.notes = notes;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (employees.count() == 0) {
            createEmployees();
        }
        if (courtesyCars.count() == 0) {
            createCourtesyCars();
        }
        if (customers.count() == 0) {
            createCustomersAndVehicles();
        }
        if (tasks.count() == 0) {
            createTasks();
        }
        if (todos.count() == 0) {
            createTodos();
        }
        if (notes.count() == 0) {
            createNotes();
        }
    }

    /** Pinboard: a note for two people with sub-tasks, one about a task, one for nobody, one archived. */
    private void createNotes() {
        List<Employee> forNotes = employees.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .filter(Employee::isSelectableForTodos)
                .toList();
        if (forNotes.size() < 2) {
            return;
        }
        LocalDate today = LocalDate.now(clock);
        Task firstTask = tasks.findAll().stream().findFirst().orElse(null);

        Note service = notes.save(new Note(new NoteDetails("Grosser Service Sprinter vorbereiten", "Kunde bringt eigene Wischblätter mit",
                Set.of(forNotes.get(0), forNotes.get(1)), null)));
        notes.save(new Note(new NoteDetails("Kunde fragt nach Offerte Winterreifen", null, Set.of(forNotes.get(1)), firstTask)));
        notes.save(new Note(new NoteDetails("Werkstatt-Apéro am Freitag organisieren", null, Set.of(), null)));
        Note archived = new Note(new NoteDetails("Prüfgerät kalibrieren lassen", "erledigt durch Firma Muster", Set.of(forNotes.get(0)), null));
        archived.archive(clock.instant());
        notes.save(archived);
        // write the notes first: a to-do knows its note only by ID, so Hibernate (order_inserts) does not
        // know it must insert the note before the to-do
        notes.flush();

        todos.saveAll(List.of(
                new Todo(new TodoDetails("Öl und Filter bereitlegen", forNotes.get(1), today, false, null), service.getId()),
                new Todo(new TodoDetails("Termin mit Kunde bestätigen", forNotes.get(0), null, false, null), service.getId())));
        log.info("Dev sample data created: 4 notes");
    }

    /** A few to-dos: overdue, for a task, on the shopping list, without person, one done. */
    private void createTodos() {
        LocalDate today = LocalDate.now(clock);
        List<Employee> forTodos = employees.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .filter(Employee::isSelectableForTodos)
                .toList();
        if (forTodos.isEmpty()) {
            return;
        }
        Function<Integer, Employee> person = i -> forTodos.get(i % forTodos.size());
        Task firstTask = tasks.findAll().stream().findFirst().orElse(null);

        List<Todo> sample = List.of(
                new Todo(new TodoDetails("Kunde wegen Offerte zurückrufen", person.apply(0), today.minusDays(1), false, null)),
                new Todo(new TodoDetails("Bremsscheiben bestellen", person.apply(1), today, false, firstTask)),
                new Todo(new TodoDetails("Kaffee und Milch", null, null, true, null)),
                new Todo(new TodoDetails("Altöl entsorgen lassen", null, today.plusDays(5), false, null)),
                new Todo(new TodoDetails("Hebebühne 2 prüfen lassen", person.apply(2), today.minusDays(3), false, null)));
        sample.get(4).markDone(clock.instant(), person.apply(0).getId());
        todos.saveAll(sample);
        log.info("Dev sample data created: {} to-dos", sample.size());
    }

    private void createEmployees() {
        List<EmployeeDetails> team = List.of(
                person("Reto", Role.MANAGEMENT, "#f6d860", "1985-03-12", 25),
                person("Erich", Role.MECHANIC, "#ff9f9f", "1978-07-24", 25),
                person("Döme", Role.MECHANIC, "#9fdfaa", "1992-11-03", 20),
                person("Mora", Role.MECHANIC, "#9fc8f0", "1995-05-18", 20),
                person("Noser", Role.APPRENTICE, "#d4b0f0", "2004-09-30", 25));

        for (int i = 0; i < team.size(); i++) {
            employees.save(new Employee(team.get(i), i));
        }
        log.info("Dev sample data created: {} employees", team.size());
    }

    /** Dates relative to today, so the warnings ("service overdue", "due soon") can always be seen. */
    private void createCourtesyCars() {
        LocalDate today = LocalDate.now(clock);
        List<CourtesyCarDetails> cars = List.of(
                new CourtesyCarDetails("Ersatzwagen 1", "VW Polo", "ZH 10001", today.plusMonths(5), today.plusYears(1)),
                new CourtesyCarDetails("Ersatzwagen 2", "Skoda Fabia", "ZH 10002", today.minusDays(3), today.plusDays(20)));

        for (int i = 0; i < cars.size(); i++) {
            courtesyCars.save(new CourtesyCar(cars.get(i), i));
        }
        log.info("Dev sample data created: {} courtesy cars", cars.size());
    }

    private static EmployeeDetails person(String name, Role role, String color, String birthday, int vacationDays) {
        return new EmployeeDetails(name, role, color, LocalDate.parse(birthday), vacationDays, true, true, true);
    }

    /**
     * Fictitious customers (no real people): two as if imported from SwissGarage, one walk-in.
     * The real ones come with the SwissGarage import (5c).
     */
    private void createCustomersAndVehicles() {
        LocalDate today = LocalDate.now(clock);
        Customer huber = customers.save(Customer.fromSwissGarage("90001", new CustomerDetails(
                "Herr", "Peter", "Huber", null, null, "Musterstrasse 12", "8400", "Winterthur",
                "052 000 00 01", "079 000 00 01", null)));
        Customer musterAg = customers.save(Customer.fromSwissGarage("90002", new CustomerDetails(
                null, null, null, "Muster Transport AG", "z. Hd. Frau Keller", "Industriestrasse 5", "8404", "Winterthur",
                "052 000 00 02", null, null)));
        Customer walkIn = customers.save(Customer.local(new CustomerDetails(
                "Frau", "Anna", "Beispiel", null, null, null, null, "Seuzach", null, "078 000 00 03", null)));

        vehicles.save(Vehicle.fromSwissGarage("70001", huber, new VehicleDetails(
                "ZH 900001", "VW", "Golf", null, LocalDate.of(2019, 3, 15), 2019, 86_000, today.minusYears(2), "Grau", "Benzin")));
        vehicles.save(Vehicle.fromSwissGarage("70002", musterAg, new VehicleDetails(
                "ZH 900002", "Mercedes-Benz", "Sprinter", null, LocalDate.of(2017, 6, 1), 2017, 154_000, today.minusYears(1), "Weiss", "Diesel")));
        vehicles.save(Vehicle.fromSwissGarage("70003", musterAg, new VehicleDetails(
                "ZH 900003", "Skoda", "Octavia Combi", null, LocalDate.of(2021, 9, 20), 2021, 61_000, null, "Blau", "Diesel")));
        vehicles.save(Vehicle.local(walkIn, new VehicleDetails(
                "ZH 900004", "Toyota", "Yaris", null, null, 2015, null, null, "Rot", "Hybrid")));
        log.info("Dev sample data created: 3 customers, 4 vehicles");
    }

    /**
     * Tasks yesterday, today and tomorrow – every status, a waiting customer, parts on order,
     * a task without vehicle and one without lift. Relative to today, so the views always show something.
     */
    private void createTasks() {
        Map<String, Vehicle> byPlate = vehicles.findAll().stream()
                .filter(v -> v.getDetails().licensePlate() != null)
                .collect(Collectors.toMap(v -> v.getDetails().licensePlate(), Function.identity(), (a, b) -> a));
        List<Employee> mechanics = employees.findAll().stream()
                .filter(e -> e.isActive() && e.isSelectableAsMechanic())
                .toList();
        List<Lift> activeLifts = lifts.findByActiveTrueOrderBySortOrderAscNameAsc();
        List<ServiceItem> items = serviceItems.findByActiveTrueOrderBySortOrderAscNameAsc();
        Vehicle golf = byPlate.get("ZH 900001");
        Vehicle sprinter = byPlate.get("ZH 900002");
        Vehicle octavia = byPlate.get("ZH 900003");
        Vehicle yaris = byPlate.get("ZH 900004");
        if (golf == null || sprinter == null || octavia == null || yaris == null
                || mechanics.isEmpty() || activeLifts.isEmpty()) {
            log.info("Dev sample data: no tasks – the sample vehicles, mechanics or lifts are missing");
            return;
        }

        LocalDate today = LocalDate.now(clock);
        SampleTasks sample = new SampleTasks();
        Function<Integer, Employee> mechanic = i -> mechanics.get(i % mechanics.size());
        Function<Integer, Lift> lift = i -> activeLifts.get(i % activeLifts.size());
        Set<ServiceItem> oilAndBrakes = items.size() > 3 ? Set.of(items.get(0), items.get(3)) : Set.copyOf(items);

        Task wheels = sample.add(golf, new Appointment(today, LocalTime.of(7, 30), today.atTime(8, 30), null, null, true),
                mechanic.apply(0), lift.apply(0),
                new TaskWork(true, TireChangeKind.WHEELS_STORED, false, null, Set.of(), null, "Winterräder montieren"), null);
        wheels.changeStatus(TaskStatus.IN_PROGRESS);

        sample.add(sprinter, until(Appointment.at(today, LocalTime.of(8, 0)), 11, 0), mechanic.apply(1), lift.apply(1),
                new TaskWork(false, null, true, today.atTime(10, 0), oilAndBrakes, null, null), "Schlüssel im Briefkasten");

        Task waiting = sample.add(octavia, new Appointment(today, LocalTime.of(10, 0), today.plusDays(1).atTime(12, 0), null, null, false), mechanic.apply(2), lift.apply(2),
                new TaskWork(false, null, false, null, Set.of(),
                        new PartsOrder("Bremsscheiben vorne", PartsStatus.ORDERED, "Derendinger", today.minusDays(1)),
                        "Bremsen vorne ersetzen"), null);
        waiting.changeStatus(TaskStatus.WAITING_FOR_PARTS);

        Task done = sample.add(yaris, Appointment.at(today, LocalTime.of(13, 30)), mechanic.apply(3), lift.apply(0),
                new TaskWork(true, TireChangeKind.TIRES_BROUGHT, false, null, Set.of(), null, null), null);
        done.changeStatus(TaskStatus.DONE);

        // tomorrow: one with the vehicle still open, one without lift that arrives the evening before
        sample.add(golf.getCustomer(), null, Appointment.at(today.plusDays(1), LocalTime.of(8, 0)), null, lift.apply(1),
                TaskWork.described("Service am neuen Auto"), "Neues Fahrzeug, noch nicht in SwissGarage");
        sample.add(yaris, new Appointment(today.plusDays(1), LocalTime.of(9, 30), today.plusDays(1).atTime(11, 0), today.atTime(17, 30),
                today.plusDays(1).atTime(16, 0), false), mechanic.apply(1), null, TaskWork.described("Klimaanlage prüfen"), null);

        Task yesterday = sample.add(sprinter, Appointment.at(today.minusDays(1), LocalTime.of(7, 30)), mechanic.apply(0),
                lift.apply(0), TaskWork.described("Grosser Service"), null);
        yesterday.changeStatus(TaskStatus.DONE);
        yesterday.assignTaskNumber("A-90001");

        tasks.saveAll(sample.created);
        log.info("Dev sample data created: {} tasks", sample.created.size());
    }

    /** The same appointment, ending at the given time of its day – realistic durations in the sample */
    private static Appointment until(Appointment appointment, int hour, int minute) {
        return new Appointment(appointment.date(), appointment.time(), appointment.date().atTime(hour, minute),
                appointment.arrivesEarlier(), appointment.readyBy(), appointment.waitingCustomer());
    }

    /**
     * Collects the sample tasks. A task that would overlap another one on its lift (few lifts
     * configured) goes to "Ohne Lift" – the database refuses two cars on one lift at the same time.
     */
    private static final class SampleTasks {

        private final List<Task> created = new ArrayList<>();

        Task add(Vehicle vehicle, Appointment appointment, Employee mechanic, Lift lift, TaskWork work, String notes) {
            return add(vehicle.getCustomer(), vehicle, appointment, mechanic, lift, work, notes);
        }

        Task add(Customer customer, Vehicle vehicle, Appointment appointment, Employee mechanic, Lift lift,
                 TaskWork work, String notes) {
            boolean taken = lift != null && created.stream()
                    .anyMatch(t -> lift.equals(t.getLift()) && overlap(t.getAppointment(), appointment));
            Task task = new Task(new TaskDetails(customer, vehicle, appointment, mechanic, taken ? null : lift, work, notes));
            created.add(task);
            return task;
        }

        private static boolean overlap(Appointment a, Appointment b) {
            return a.start().isBefore(b.end()) && b.start().isBefore(a.end());
        }
    }
}
