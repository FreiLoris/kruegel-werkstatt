package ch.kruegel.workshop.task;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
 * endpoints; the task number is assigned by the app. Rules that need the database or several fields
 * ("kommt früher" before the appointment, end after the start, lift free, …) are checked by {@link TaskService}.
 *
 * <p>The ticks ({@code timeOpen}, {@code waitingCustomer}, {@code tireChange}, {@code mfk}) may be missing = not ticked.
 * {@code Boolean} instead of {@code boolean}: Jackson 3 refuses a missing value for a primitive.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record TaskRequest(
        @NotNull UUID customerId,
        UUID vehicleId,
        @Schema(description = "Empty = no appointment yet (list \"Ohne Termin\"); then time, end, lift, \"kommt früher\" and \"fertig bis\" are empty too") LocalDate date,
        @Schema(type = "string", example = "08:00", description = "Required with a date") LocalTime time,
        @Schema(example = "2026-10-15T09:00", description = "Until when the lift is taken; empty = 1 hour after the start") LocalDateTime endAt,
        @Schema(description = "The clock time is not agreed yet – start and end only reserve the lift. Missing = false") Boolean timeOpen,
        @Schema(example = "2026-10-14T18:00") LocalDateTime arrivesEarlier,
        @Schema(example = "2026-10-15T16:30") LocalDateTime readyBy,
        @Schema(description = "Missing = false") Boolean waitingCustomer,
        UUID mechanicId,
        UUID liftId,
        @Schema(description = "Missing = false") Boolean tireChange,
        TireChangeKind tireChangeKind,
        @Schema(description = "Missing = false") Boolean mfk,
        @Schema(example = "2026-10-15T10:00") LocalDateTime mfkAppointment,
        @Min(Task.MFK_MINUTES_MIN) @Max(Task.MFK_MINUTES_MAX)
        @Schema(description = "MFK: how long the car is away incl. the drive; empty = 1 hour") Integer mfkMinutes,
        @Schema(description = "MFK: who drives the car there; may be open") UUID mfkDriverId,
        List<UUID> serviceItemIds,
        @Valid @Schema(description = "Empty = no parts needed") Parts parts,
        @Size(max = TaskWork.DESCRIPTION_MAX) String workDescription,
        @Size(max = TaskDetails.NOTES_MAX) String notes,
        @Schema(description = "Who took the order from the customer (\"Annehmer\") – required; checked by the service") UUID acceptedById,
        @Schema(description = "Insurance case: the insurance; empty = no insurance case") UUID insuranceId,
        @Size(max = Task.CLAIM_NUMBER_MAX) @Schema(description = "The insurance's claim number – only with an insurance, may still be open") String claimNumber,
        @Schema(description = "Only needed when editing") Long version) {

    public TaskRequest {
        timeOpen = Boolean.TRUE.equals(timeOpen);
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
