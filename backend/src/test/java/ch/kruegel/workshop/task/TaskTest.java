package ch.kruegel.workshop.task;

import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerTestData;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit tests for the task rules – no Spring, no database. */
class TaskTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 15);
    private static final LocalTime EIGHT = LocalTime.of(8, 0);

    private final Customer huber = CustomerTestData.local("Huber");

    private TaskDetails details(TaskWork work) {
        return new TaskDetails(huber, null, Appointment.at(DAY, EIGHT), null, null, work, null);
    }

    @Test
    void newTaskIsReceivedAndKeepsWhatWasEntered() {
        Task task = new Task(details(TaskWork.described("Grosser Service")), 3);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.RECEIVED);
        assertThat(task.getSortOrder()).isEqualTo(3);
        assertThat(task.getVehicle()).isNull();
        assertThat(task.getWork().description()).isEqualTo("Grosser Service");
    }

    @Test
    void statusCanGoForwardAndBack() {
        Task task = new Task(details(TaskWork.described(null)), 0);

        task.changeStatus(TaskStatus.DONE);
        task.changeStatus(TaskStatus.IN_PROGRESS);

        assertThat(task.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
    }

    @Test
    void waitingCustomerIsAFlagIndependentOfTheStatus() {
        Appointment waiting = new Appointment(DAY, EIGHT, null, null, true);
        Task task = new Task(new TaskDetails(huber, null, waiting, null, null, TaskWork.described(null), null), 0);

        task.changeStatus(TaskStatus.WAITING_FOR_PARTS);

        assertThat(task.getAppointment().waitingCustomer()).isTrue();
        assertThat(task.getStatus()).isEqualTo(TaskStatus.WAITING_FOR_PARTS);
    }

    @Test
    void taskNumberIsTrimmedAndEmptyRemovesIt() {
        Task task = new Task(details(TaskWork.described(null)), 0);

        task.assignTaskNumber("  A-2026-17 ");
        assertThat(task.getTaskNumber()).isEqualTo("A-2026-17");

        task.assignTaskNumber(" ");
        assertThat(task.getTaskNumber()).isNull();

        assertThatThrownBy(() -> task.assignTaskNumber("1".repeat(31))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void arrivesEarlierMustBeBeforeAndReadyByAfterTheAppointment() {
        LocalDateTime eveningBefore = DAY.minusDays(1).atTime(18, 0);
        LocalDateTime noon = DAY.atTime(12, 0);

        assertThat(new Appointment(DAY, EIGHT, eveningBefore, noon, false).start()).isEqualTo(DAY.atTime(EIGHT));
        assertThatThrownBy(() -> new Appointment(DAY, EIGHT, noon, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Appointment(DAY, EIGHT, null, eveningBefore, false)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void tireChangeKindAndMfkAppointmentOnlyWithTheirWork() {
        assertThatThrownBy(() -> new TaskWork(false, TireChangeKind.WHEELS_STORED, false, null, Set.of(), null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TaskWork(false, null, false, DAY.atTime(10, 0), Set.of(), null, null))
                .isInstanceOf(IllegalArgumentException.class);

        // kind and appointment may still be open
        TaskWork open = new TaskWork(true, null, true, null, null, null, null);
        assertThat(open.serviceItems()).isEmpty();
    }

    @Test
    void partsNeedADescription() {
        assertThatThrownBy(() -> PartsOrder.toOrder("  ")).isInstanceOf(IllegalArgumentException.class);
        assertThat(new PartsOrder(" Bremsscheiben ", PartsStatus.ORDERED, " ", null))
                .isEqualTo(new PartsOrder("Bremsscheiben", PartsStatus.ORDERED, null, null));
    }

    @Test
    void updateReplacesTheTickedServiceItems() {
        ServiceItem oil = new ServiceItem("Ölwechsel", 0);
        ServiceItem wipers = new ServiceItem("Wischblätter", 1);
        Task task = new Task(details(new TaskWork(false, null, false, null, Set.of(oil), null, null)), 0);

        task.update(details(new TaskWork(false, null, false, null, Set.of(wipers), null, null)));

        assertThat(task.getWork().serviceItems()).containsExactly(wipers);
    }
}
