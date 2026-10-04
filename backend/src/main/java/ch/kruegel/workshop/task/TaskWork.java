package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.serviceitem.ServiceItem;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * What is done on the vehicle – everything ticked in the wizard ends up on the task sheet (F1).
 *
 * @param tireChange      Radwechsel
 * @param tireChangeKind  which wheels/tires – only with a tire change, may still be open
 * @param mfk             vehicle goes to the official inspection (MFK)
 * @param mfkAppointment  appointment at the inspection station – only with MFK, may still be open
 * @param serviceItems    ticked service items (Ölwechsel, Wischblätter, …)
 * @param parts           parts to order; {@code null} = none needed
 * @param description     further work as free text ("Arbeiten")
 */
public record TaskWork(
        boolean tireChange,
        TireChangeKind tireChangeKind,
        boolean mfk,
        LocalDateTime mfkAppointment,
        Set<ServiceItem> serviceItems,
        PartsOrder parts,
        String description) {

    static final int DESCRIPTION_MAX = 2000;

    public TaskWork {
        if (!tireChange && tireChangeKind != null) {
            throw new IllegalArgumentException("Tire change kind without tire change: " + tireChangeKind);
        }
        if (!mfk && mfkAppointment != null) {
            throw new IllegalArgumentException("MFK appointment without MFK: " + mfkAppointment);
        }
        serviceItems = serviceItems == null ? Set.of() : Set.copyOf(serviceItems);
        description = Texts.checkMaxLength(Texts.emptyToNull(description), DESCRIPTION_MAX, "Work description");
    }

    /** Only free text, nothing ticked. */
    public static TaskWork described(String description) {
        return new TaskWork(false, null, false, null, Set.of(), null, description);
    }
}
