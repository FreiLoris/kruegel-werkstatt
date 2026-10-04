package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.web.BusinessRuleException;

/**
 * Safety net for all SwissGarage imports: a file that would deactivate most of the known records
 * is probably a filtered or partial export by mistake – refuse it instead of deactivating hundreds.
 */
final class ImportGuard {

    /** Refuse if more than this share of the known active records would be deactivated */
    static final double MAX_DEACTIVATED_SHARE = 0.5;
    /** …but only from this number of known records on (the first imports may differ a lot) */
    static final int FROM_KNOWN = 20;

    private ImportGuard() {
    }

    /**
     * @param what German plural for the message, e.g. "Kunden", "Fahrzeuge"
     * @throws BusinessRuleException if too many would be deactivated (→ 409, nothing is imported)
     */
    static void checkDeactivations(long knownActive, long toDeactivate, String what) {
        if (knownActive >= FROM_KNOWN && toDeactivate > knownActive * MAX_DEACTIVATED_SHARE) {
            throw new BusinessRuleException("Die Datei enthält nur " + (knownActive - toDeactivate) + " von "
                    + knownActive + " bekannten " + what + ". Ist es der vollständige Export aus SwissGarage? "
                    + "Nichts importiert – sonst würden " + toDeactivate + " " + what + " deaktiviert.");
        }
    }
}
