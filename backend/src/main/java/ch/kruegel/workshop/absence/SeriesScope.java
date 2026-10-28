package ch.kruegel.workshop.absence;

/** Which days of a series a change or delete is for (FB-33) */
public enum SeriesScope {
    /** only the day clicked – e.g. one Monday in the workshop after all */
    DAY,
    /** this day and the later ones – e.g. back earlier */
    FROM_HERE,
    /** all days of the series */
    ALL
}
