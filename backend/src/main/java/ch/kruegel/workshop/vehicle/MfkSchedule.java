package ch.kruegel.workshop.vehicle;

import java.time.LocalDate;

/**
 * When the next official inspection (MFK) is probably due.
 *
 * <p>Rule for passenger cars and vans up to 3.5 t (VTS Art. 33): first inspection 4 years after
 * the first registration, the next one 3 years later, then every 2 years. The road traffic office
 * sends the invitation – this is only an <b>estimate</b> for the warning in the wizard. Heavy vehicles
 * and motorcycles have other intervals; the export does not tell the vehicle category.
 */
public final class MfkSchedule {

    private MfkSchedule() {
    }

    /**
     * @param firstRegistration first registration ("1. Inverkehrsetzung"), may be unknown
     * @param lastMfk           date of the last inspection, may be unknown
     * @return estimated due date, or {@code null} if neither date is known
     */
    public static LocalDate nextDue(LocalDate firstRegistration, LocalDate lastMfk) {
        if (lastMfk == null) {
            return firstRegistration == null ? null : firstRegistration.plusYears(4);
        }
        // An inspection within the first 5 years was the first one → the next comes after 3 years
        boolean wasFirstInspection = firstRegistration != null && lastMfk.isBefore(firstRegistration.plusYears(5));
        return lastMfk.plusYears(wasFirstInspection ? 3 : 2);
    }
}
