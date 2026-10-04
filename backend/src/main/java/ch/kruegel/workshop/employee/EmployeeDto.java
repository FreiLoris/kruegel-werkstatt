package ch.kruegel.workshop.employee;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * An employee as delivered by the API. The entity itself never leaves the backend –
 * so we can change the database without breaking the API (and vice versa).
 */
public record EmployeeDto(
        UUID id,
        long version,
        String name,
        Role role,
        String color,
        @Schema(types = {"string", "null"}, format = "date") LocalDate birthday,
        int vacationDaysPerYear,
        boolean selectableAsMechanic,
        boolean selectableForTodos,
        boolean hasPinboardColumn,
        boolean active,
        int sortOrder,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last (empty: sample data/initial setup)") UUID updatedBy) {

    static EmployeeDto of(Employee e) {
        return new EmployeeDto(e.getId(), e.getVersion(), e.getName(), e.getRole(), e.getColor(),
                e.getBirthday(), e.getVacationDaysPerYear(), e.isSelectableAsMechanic(),
                e.isSelectableForTodos(), e.hasPinboardColumn(), e.isActive(), e.getSortOrder(),
                e.getUpdatedAt(), e.getUpdatedBy());
    }
}
