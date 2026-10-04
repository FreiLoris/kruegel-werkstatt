package ch.kruegel.workshop.employee;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * All freely editable details of a person – the same for creating and editing.
 *
 * <p>Checks the business rules on construction and cleans up the values (whitespace, color
 * in lower case). An {@link Employee} entity can therefore never contain invalid data,
 * no matter where it comes from (API, migration, tests).
 *
 * @param name                 display name, 1–40 characters
 * @param role                 function in the business
 * @param color                hex color "#rrggbb"
 * @param birthday             optional
 * @param vacationDaysPerYear  vacation days per year, 0–60
 * @param selectableAsMechanic appears as mechanic on appointments
 * @param selectableForTodos   appears as responsible person on to-dos and notes
 * @param hasPinboardColumn    has its own column on the pinboard
 */
public record EmployeeDetails(
        String name,
        Role role,
        String color,
        LocalDate birthday,
        int vacationDaysPerYear,
        boolean selectableAsMechanic,
        boolean selectableForTodos,
        boolean hasPinboardColumn) {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-f]{6}$");

    public EmployeeDetails {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(role, "role");
        Objects.requireNonNull(color, "color");

        name = name.strip();
        color = color.strip().toLowerCase(Locale.ROOT);

        if (name.isEmpty() || name.length() > 40) {
            throw new IllegalArgumentException("Name must be 1–40 characters: '" + name + "'");
        }
        if (!HEX_COLOR.matcher(color).matches()) {
            throw new IllegalArgumentException("Color must be #rrggbb: '" + color + "'");
        }
        if (vacationDaysPerYear < 0 || vacationDaysPerYear > 60) {
            throw new IllegalArgumentException("Vacation days must be between 0 and 60: " + vacationDaysPerYear);
        }
    }
}
