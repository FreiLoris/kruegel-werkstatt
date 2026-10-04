package ch.kruegel.workshop.courtesycar;

import java.time.LocalDate;

/**
 * How urgent is a date such as "service due" or "insurance until"?
 *
 * <p>Computed by the backend with the central clock, so the rule exists in one place and the
 * frontend only shows the result.
 */
public enum DueStatus {
    /** More than {@value #SOON_DAYS} days left. */
    OK,
    /** Within the next {@value #SOON_DAYS} days (including today) – plan it. */
    DUE_SOON,
    /** Date has passed. */
    OVERDUE;

    static final int SOON_DAYS = 30;

    /** {@code null} if there is no date. */
    static DueStatus of(LocalDate due, LocalDate today) {
        if (due == null) {
            return null;
        }
        if (due.isBefore(today)) {
            return OVERDUE;
        }
        return due.isAfter(today.plusDays(SOON_DAYS)) ? OK : DUE_SOON;
    }
}
