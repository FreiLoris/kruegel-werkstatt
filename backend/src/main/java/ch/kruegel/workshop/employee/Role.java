package ch.kruegel.workshop.employee;

/**
 * Function of a person in the business. Stored in the database as text
 * (e.g. "MECHANIC") – the German display ("Mechaniker", "Büro") is done by the frontend.
 */
public enum Role {
    MANAGEMENT,
    MECHANIC,
    OFFICE,
    APPRENTICE,
    INTERN
}
