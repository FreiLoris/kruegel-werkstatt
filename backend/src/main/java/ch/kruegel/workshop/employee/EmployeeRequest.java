package ch.kruegel.workshop.employee;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Input for creating and editing (JSON from the frontend).
 *
 * <p>The annotations check the input before the service sees it – errors go back to the form
 * as 400 with the field name. The same rules exist again in {@link EmployeeDetails} and as
 * database constraints. Messages are German because the user reads them.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record EmployeeRequest(
        @NotBlank @Size(max = 40) String name,
        @NotNull Role role,
        @NotNull @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "muss eine Farbe im Format #rrggbb sein") String color,
        @Past LocalDate birthday,
        @Schema(requiredMode = REQUIRED) @Min(0) @Max(60) int vacationDaysPerYear,
        @Schema(requiredMode = REQUIRED) boolean selectableAsMechanic,
        @Schema(requiredMode = REQUIRED) boolean selectableForTodos,
        @Schema(requiredMode = REQUIRED) boolean hasPinboardColumn,
        @Schema(description = "Only needed when editing") Long version) {

    EmployeeDetails toDetails() {
        return new EmployeeDetails(name, role, color, birthday, vacationDaysPerYear,
                selectableAsMechanic, selectableForTodos, hasPinboardColumn);
    }
}
