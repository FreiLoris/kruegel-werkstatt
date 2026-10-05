package ch.kruegel.workshop.task;

import ch.kruegel.workshop.TestcontainersConfiguration;
import ch.kruegel.workshop.common.config.JpaConfig;
import ch.kruegel.workshop.common.config.TimeConfig;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.employee.EmployeeTestData;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tasks in the real database: mapping of all fields and the rules the database itself enforces.
 * Rolled back after each test ({@code @DataJpaTest}).
 */
@DataJpaTest
@Import({TestcontainersConfiguration.class, JpaConfig.class, TimeConfig.class})
class TaskPersistenceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 15);

    @Autowired
    private EntityManager em;

    @Autowired
    private TaskRepository tasks;

    private Customer huber;
    private Vehicle golf;
    private Employee reto;
    private Lift lift;
    private ServiceItem oil;
    private ServiceItem wipers;

    @BeforeEach
    void masterData() {
        huber = persist(CustomerTestData.local("Huber"));
        golf = persist(Vehicle.local(huber, new VehicleDetails("ZH 123456", "VW", "Golf", null, null, null, null, null, null, null)));
        reto = persist(EmployeeTestData.employee("Reto", 0));
        lift = persist(new Lift("Testlift", 99));
        oil = persist(new ServiceItem("Test Öl", 98));
        wipers = persist(new ServiceItem("Test Wischer", 99));
    }

    @Test
    void storesAndLoadsAllFields() {
        Appointment appointment = new Appointment(DAY, LocalTime.of(8, 0), DAY.atTime(11, 30),
                DAY.minusDays(1).atTime(18, 0), DAY.atTime(16, 30), true);
        TaskWork work = new TaskWork(true, TireChangeKind.WHEELS_STORED, true, DAY.atTime(10, 0),
                Set.of(oil, wipers), new PartsOrder("Bremsscheiben vorne", PartsStatus.ORDERED, "Derendinger", DAY.minusDays(3)),
                "Bremsen vorne ersetzen");
        Task task = new Task(new TaskDetails(huber, golf, appointment, reto, lift, work, "Kunde ruft an"));
        task.assignTaskNumber("A-17");
        task.changeStatus(TaskStatus.WAITING_FOR_PARTS);

        Task loaded = saveAndReload(task);

        assertThat(loaded.getId().version()).isEqualTo(7);
        assertThat(loaded.getTaskNumber()).isEqualTo("A-17");
        assertThat(loaded.getStatus()).isEqualTo(TaskStatus.WAITING_FOR_PARTS);
        assertThat(loaded.getAppointment()).isEqualTo(appointment);
        assertThat(loaded.getCustomer().getId()).isEqualTo(huber.getId());
        assertThat(loaded.getVehicle().getId()).isEqualTo(golf.getId());
        assertThat(loaded.getMechanic().getId()).isEqualTo(reto.getId());
        assertThat(loaded.getLift().getId()).isEqualTo(lift.getId());
        assertThat(loaded.getWork()).isEqualTo(work);
        assertThat(loaded.getDetails().notes()).isEqualTo("Kunde ruft an");
    }

    @Test
    void minimalTaskHasNoPartsAndNoVehicle() {
        Task task = new Task(new TaskDetails(huber, null, Appointment.at(DAY, LocalTime.of(7, 30)), null, null,
                TaskWork.described(null), null));

        Task loaded = saveAndReload(task);

        assertThat(loaded.getVehicle()).isNull();
        assertThat(loaded.getWork().parts()).isNull();
        assertThat(loaded.getWork().serviceItems()).isEmpty();
        assertThat(loaded.getAppointment().waitingCustomer()).isFalse();
    }

    @Test
    void taskNumberIsUnique() {
        Task first = minimalTask();
        first.assignTaskNumber("A-17");
        tasks.saveAndFlush(first);
        Task second = minimalTask();
        second.assignTaskNumber("A-17");

        assertThatThrownBy(() -> tasks.saveAndFlush(second)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingATaskRemovesItsTickedServiceItemsButNotTheServiceItems() {
        Task task = new Task(new TaskDetails(huber, null, Appointment.at(DAY, LocalTime.of(8, 0)), null, null,
                new TaskWork(false, null, false, null, Set.of(oil), null, null), null));
        tasks.saveAndFlush(task);

        tasks.delete(task);
        tasks.flush();

        assertThat(count("SELECT count(*) FROM task_service_item")).isZero();
        assertThat(em.find(ServiceItem.class, oil.getId())).isNotNull();
    }

    @Test
    void databaseRejectsReadyByBeforeTheAppointment() {
        Task task = tasks.saveAndFlush(minimalTask());

        // the record already prevents this – the check constraint protects against other ways into the table
        assertThatThrownBy(() -> em.createNativeQuery("UPDATE task SET ready_by = :before WHERE id = :id")
                .setParameter("before", LocalDateTime.of(DAY.minusDays(1), LocalTime.NOON))
                .setParameter("id", task.getId())
                .executeUpdate())
                .hasMessageContaining("task_check");
    }

    @Test
    void localTimesAreStoredAsWallClockTimes() {
        // whatever zone the JVM runs in (surefire: Europe/Zurich) – 08:00 is 08:00 in the database too,
        // otherwise the constraints compare shifted times
        Task task = tasks.saveAndFlush(onLift(LocalTime.of(8, 0), LocalTime.of(9, 30)));

        Object[] row = (Object[]) em.createNativeQuery("SELECT appointment_time::text, appointment_end::text FROM task WHERE id = :id")
                .setParameter("id", task.getId())
                .getSingleResult();

        assertThat(row).containsExactly("08:00:00", "2026-10-15 09:30:00");
    }

    @Test
    void databaseRejectsTwoTasksOnOneLiftAtTheSameTime() {
        tasks.saveAndFlush(onLift(LocalTime.of(8, 0), LocalTime.of(10, 0)));
        // directly after is fine: the ranges are half open
        tasks.saveAndFlush(onLift(LocalTime.of(10, 0), LocalTime.of(11, 0)));

        assertThatThrownBy(() -> tasks.saveAndFlush(onLift(LocalTime.of(9, 0), LocalTime.of(9, 30))))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("task_no_lift_overlap");
    }

    private Task onLift(LocalTime start, LocalTime end) {
        return new Task(new TaskDetails(huber, null, new Appointment(DAY, start, DAY.atTime(end), null, null, false),
                null, lift, TaskWork.described(null), null));
    }

    private Task minimalTask() {
        return new Task(new TaskDetails(huber, null, Appointment.at(DAY, LocalTime.of(8, 0)), null, null,
                TaskWork.described(null), null));
    }

    private Task saveAndReload(Task task) {
        tasks.saveAndFlush(task);
        em.clear();
        return tasks.findById(task.getId()).orElseThrow();
    }

    private long count(String sql) {
        return ((Number) em.createNativeQuery(sql).getSingleResult()).longValue();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
