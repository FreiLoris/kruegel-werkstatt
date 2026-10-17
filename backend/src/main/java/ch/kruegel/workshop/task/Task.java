package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.employee.Employee;
import ch.kruegel.workshop.inspectionstation.InspectionStation;
import ch.kruegel.workshop.insurance.Insurance;
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

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * A task (Auftrag/Termin): customer and vehicle, appointment, mechanic and lift, the work to do
 * and where it stands. Unlike master data, tasks can be deleted (6b).
 *
 * <p>Entered data comes in as {@link TaskDetails} ({@link #Task(TaskDetails, int) create},
 * {@link #update}). Status and task number have their own methods because they
 * change on their own – e.g. the mechanic sets "in progress" on the dashboard.
 *
 * <p>References are LAZY: lists and calendars usually only need the IDs.
 */
@Entity
public class Task extends BaseEntity {

    static final int TASK_NUMBER_MAX = 30;
    static final int CLAIM_NUMBER_MAX = 60;
    /** The trip to the inspection: one hour unless said otherwise (FB-10) */
    static final int MFK_MINUTES_DEFAULT = 60;
    static final int MFK_MINUTES_MIN = 15;
    static final int MFK_MINUTES_MAX = 480;

    /** Assigned by the app when the task is created ("26-0001"); older ones may be SwissGarage numbers. Unique */
    private String taskNumber;

    /** Who took the order from the customer ("Annehmer"); empty only for tasks from before 12d */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by")
    private Employee acceptedBy;

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

    /** How long the car is away for the MFK, incl. the drive – only with MFK, then always set (FB-10) */
    private Integer mfkMinutes;

    /** Who drives the car to the inspection – may be open; only a hint, it takes none of their time */
    @ManyToOne(fetch = FetchType.LAZY)
    private Employee mfkDriver;

    /** Where the MFK is (FB-10) – only with MFK; empty only for tasks of sample data and tests */
    @ManyToOne(fetch = FetchType.LAZY)
    private InspectionStation mfkStation;

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

    /** Insurance case (FB-06): empty = none */
    @ManyToOne(fetch = FetchType.LAZY)
    private Insurance insurance;

    /** The insurance's claim number ("Schadennummer") – only in an insurance case, may still be open */
    private String claimNumber;

    protected Task() {
        // for JPA
    }

    /** New task – always starts as {@link TaskStatus#RECEIVED}. */
    public Task(TaskDetails details) {
        this.status = TaskStatus.RECEIVED;
        apply(details);
    }

    public void update(TaskDetails details) {
        apply(details);
    }

    /** Any status can follow any other – also back, e.g. "done" turns out to be too early. */
    public void changeStatus(TaskStatus newStatus) {
        this.status = Objects.requireNonNull(newStatus, "status");
    }

    /** The parts order moves on (ordered, arrived) – only for a task that needs parts. */
    public void changeParts(PartsOrder newParts) {
        if (parts == null) {
            throw new IllegalStateException("Task has no parts order");
        }
        this.parts = Objects.requireNonNull(newParts, "parts");
    }

    /** Who took the order from the customer – required from 12d on, so it cannot be removed again. */
    public void acceptedBy(Employee employee) {
        this.acceptedBy = Objects.requireNonNull(employee, "acceptedBy");
    }

    /**
     * Insurance case (FB-06) – like the "Annehmer" not part of {@link TaskDetails}: set with every edit.
     *
     * @param insurance   empty = no insurance case
     * @param claimNumber may still be open; only with an insurance
     */
    public void insuranceCase(Insurance insurance, String claimNumber) {
        String number = Texts.checkMaxLength(Texts.emptyToNull(claimNumber), CLAIM_NUMBER_MAX, "Claim number");
        if (insurance == null && number != null) {
            throw new IllegalArgumentException("Claim number without insurance: " + number);
        }
        this.insurance = insurance;
        this.claimNumber = number;
    }

    /**
     * The trip to the inspection (FB-10) – like the insurance case not part of {@link TaskDetails}:
     * set with every edit, after the details (they say whether there is an MFK).
     *
     * @param station where the inspection is
     * @param minutes how long the car is away incl. the drive; empty = {@link #MFK_MINUTES_DEFAULT}
     * @param driver  who drives it there; may be open
     */
    public void mfkTrip(InspectionStation station, Integer minutes, Employee driver) {
        if (!mfk) {
            if (station != null || minutes != null || driver != null) {
                throw new IllegalArgumentException("MFK trip without MFK");
            }
            return;
        }
        int duration = minutes == null ? MFK_MINUTES_DEFAULT : minutes;
        if (duration < MFK_MINUTES_MIN || duration > MFK_MINUTES_MAX) {
            throw new IllegalArgumentException("MFK trip of " + duration + " minutes");
        }
        this.mfkStation = station;
        this.mfkMinutes = duration;
        this.mfkDriver = driver;
    }

    /** Sets the task number; empty removes it. Uniqueness is checked by the service/database. */
    public void assignTaskNumber(String number) {
        this.taskNumber = Texts.checkMaxLength(Texts.emptyToNull(number), TASK_NUMBER_MAX, "Task number");
    }

    /**
     * New time and lift (drag & drop in the day and week view). The MFK appointment stays: it is
     * booked at the inspection station, not in the workshop.
     */
    public void schedule(Appointment appointment, Lift lift) {
        this.appointment = Objects.requireNonNull(appointment, "appointment");
        this.lift = checkPlace(appointment, lift);
    }

    /**
     * Out of the plan again (12d-3) – e.g. the parts have not arrived. The order stays, with all
     * its work; day, time and lift are free for others.
     */
    public void removeAppointment() {
        this.appointment = Appointment.NONE;
        this.lift = null;
    }

    /** A lift is taken for a time – without an appointment there is none. */
    private static Lift checkPlace(Appointment appointment, Lift lift) {
        if (!appointment.isPlanned() && lift != null) {
            throw new IllegalArgumentException("A task without appointment cannot take a lift");
        }
        return lift;
    }

    private void apply(TaskDetails details) {
        this.customer = details.customer();
        this.vehicle = details.vehicle();
        this.appointment = details.appointment();
        this.mechanic = details.mechanic();
        this.lift = checkPlace(details.appointment(), details.lift());
        TaskWork work = details.work();
        this.tireChange = work.tireChange();
        this.tireChangeKind = work.tireChangeKind();
        this.mfk = work.mfk();
        this.mfkAppointment = work.mfkAppointment();
        // the trip goes with the MFK: gone without one, the default until mfkTrip says more
        if (!mfk) {
            this.mfkStation = null;
            this.mfkMinutes = null;
            this.mfkDriver = null;
        } else if (mfkMinutes == null) {
            this.mfkMinutes = MFK_MINUTES_DEFAULT;
        }
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

    public Employee getAcceptedBy() {
        return acceptedBy;
    }

    public Integer getMfkMinutes() {
        return mfkMinutes;
    }

    public Employee getMfkDriver() {
        return mfkDriver;
    }

    public InspectionStation getMfkStation() {
        return mfkStation;
    }

    public Insurance getInsurance() {
        return insurance;
    }

    public String getClaimNumber() {
        return claimNumber;
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
}
