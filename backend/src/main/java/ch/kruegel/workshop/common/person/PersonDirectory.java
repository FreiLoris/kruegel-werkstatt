package ch.kruegel.workshop.common.person;

import java.util.UUID;

/**
 * Who may be selected as person? Implemented by the {@code employee} module.
 *
 * <p>An interface instead of direct access to employees: that way {@code common} does not
 * depend on a business module (the dependency points one way only: business module → common).
 */
public interface PersonDirectory {

    /** Does the person exist and is it active? */
    boolean isActive(UUID id);

    /** Are there any active persons yet? (No = initial setup) */
    boolean anyActive();
}
