package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Input for creating and editing a task (wizard, task detail). Status and position have their own
 * endpoints; the task number can be given here or later on its own. Rules that need the database or several fields
 * ("kommt früher" before the appointment, …) are checked by {@link TaskService}.
 *
 * <p>The ticks ({@code waitingCustomer}, {@code tireChange}, {@code mfk}) may be missing = not ticked.
 * {@code Boolean} instead of {@code boolean}: Jackson 3 refuses a missing value for a primitive.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record TaskRequest(
        @NotNull UUID customerId,
        UUID vehicleId,
        @NotNull LocalDate date,
        @NotNull @Schema(type = "string", example = "08:00") LocalTime time,
        @Schema(example = "2026-10-14T18:00") LocalDateTime arrivesEarlier,
        @Schema(example = "2026-10-15T16:30") LocalDateTime readyBy,
        @Schema(description = "Missing = false") Boolean waitingCustomer,
        UUID mechanicId,
        UUID liftId,
        @Schema(description = "Missing = false") Boolean tireChange,
        TireChangeKind tireChangeKind,
        @Schema(description = "Missing = false") Boolean mfk,
        @Schema(example = "2026-10-15T10:00") LocalDateTime mfkAppointment,
        List<UUID> serviceItemIds,
        @Valid @Schema(description = "Empty = no parts needed") Parts parts,
        @Size(max = TaskWork.DESCRIPTION_MAX) String workDescription,
        @Size(max = TaskDetails.NOTES_MAX) String notes,
        @Size(max = Task.TASK_NUMBER_MAX) @Schema(description = "SwissGarage order number – may also be added later; unique") String taskNumber,
        @Schema(description = "Only needed when editing") Long version) {

    public TaskRequest {
        waitingCustomer = Boolean.TRUE.equals(waitingCustomer);
        tireChange = Boolean.TRUE.equals(tireChange);
        mfk = Boolean.TRUE.equals(mfk);
    }

    /** Parts to order. */
    public record Parts(
            @NotBlank @Size(max = PartsOrder.DESCRIPTION_MAX) String description,
            @NotNull PartsStatus status,
            @Size(max = PartsOrder.SUPPLIER_MAX) String supplier,
            LocalDate orderedOn) {

        PartsOrder toPartsOrder() {
            return new PartsOrder(description, status, supplier, orderedOn);
        }
    }
}
