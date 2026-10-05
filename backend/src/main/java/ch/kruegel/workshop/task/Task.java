package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.common.persistence.Sortable;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.lift.Lift;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.vehicle.Vehicle;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * A task (Auftrag/Termin): customer and vehicle, appointment, mechanic and lift, the work to do
 * and where it stands. Unlike master data, tasks can be deleted (6b).
 *
 * <p>Entered data comes in as {@link TaskDetails} ({@link #Task(TaskDetails, int) create},
 * {@link #update}). Status, task number and position have their own methods because they
 * change on their own – e.g. the mechanic sets "in progress" on the dashboard.
 *
 * <p>References are LAZY: lists and calendars usually only need the IDs.
 */
@Entity
public class Task extends BaseEntity implements Sortable {

    static final int TASK_NUMBER_MAX = 30;

    /** SwissGarage order number, added later by hand; unique */
    private String taskNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    private Vehicle vehicle;

    @Embedded
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    private Employee mechanic;

    @ManyToOne(fetch = FetchType.LAZY)
    private Lift lift;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    private boolean tireChange;

    @Enumerated(EnumType.STRING)
    private TireChangeKind tireChangeKind;

    private boolean mfk;
    private LocalDateTime mfkAppointment;

    @ManyToMany
    @BatchSize(size = 50)
    @JoinTable(name = "task_service_item",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "service_item_id"))
    private Set<ServiceItem> serviceItems = new HashSet<>();

    /** Empty (null) = no parts needed */
    @Embedded
    private PartsOrder parts;

    private String workDescription;
    private String notes;

    /** Position within the lift column of the day */
    private int sortOrder;

    protected Task() {
        // for JPA
    }

    /** New task – always starts as {@link TaskStatus#RECEIVED}. */
    public Task(TaskDetails details, int sortOrder) {
        this.status = TaskStatus.RECEIVED;
        this.sortOrder = sortOrder;
        apply(details);
    }

    public void update(TaskDetails details) {
        apply(details);
    }

    /** Any status can follow any other – also back, e.g. "done" turns out to be too early. */
    public void changeStatus(TaskStatus newStatus) {
        this.status = Objects.requireNonNull(newStatus, "status");
    }

    /** Sets the SwissGarage order number; empty removes it. Uniqueness is checked by the service/database. */
    public void assignTaskNumber(String number) {
        this.taskNumber = Texts.checkMaxLength(Texts.emptyToNull(number), TASK_NUMBER_MAX, "Task number");
    }

    @Override
    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    /**
     * To another day (drag & drop in the week view), see {@link Appointment#onDay}. The MFK
     * appointment stays: it is booked at the inspection station, not in the workshop.
     */
    public void moveToDay(LocalDate day) {
        this.appointment = appointment.onDay(day);
    }

    /** Into another lift column (drag & drop in the day view); the position is set by the service. */
    public void moveToLift(Lift lift) {
        this.lift = lift;
    }

    private void apply(TaskDetails details) {
        this.customer = details.customer();
        this.vehicle = details.vehicle();
        this.appointment = details.appointment();
        this.mechanic = details.mechanic();
        this.lift = details.lift();
        TaskWork work = details.work();
        this.tireChange = work.tireChange();
        this.tireChangeKind = work.tireChangeKind();
        this.mfk = work.mfk();
        this.mfkAppointment = work.mfkAppointment();
        // change the managed collection instead of replacing it – Hibernate tracks it
        this.serviceItems.clear();
        this.serviceItems.addAll(work.serviceItems());
        this.parts = work.parts();
        this.workDescription = work.description();
        this.notes = details.notes();
    }

    public TaskDetails getDetails() {
        return new TaskDetails(customer, vehicle, appointment, mechanic, lift, getWork(), notes);
    }

    public TaskWork getWork() {
        return new TaskWork(tireChange, tireChangeKind, mfk, mfkAppointment, serviceItems, parts, workDescription);
    }

    public String getTaskNumber() {
        return taskNumber;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public Customer getCustomer() {
        return customer;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public Employee getMechanic() {
        return mechanic;
    }

    public Lift getLift() {
        return lift;
    }

    public String getNotes() {
        return notes;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
