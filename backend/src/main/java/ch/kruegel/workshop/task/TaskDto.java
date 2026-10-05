package ch.kruegel.workshop.task;

import ch.kruegel.workshop.customer.CustomerDto;
import ch.kruegel.workshop.serviceitem.ServiceItem;
import ch.kruegel.workshop.vehicle.VehicleDto;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * A task as delivered by the API. Customer and vehicle come along (cards, task sheet);
 * mechanic, lift and service items only as IDs – the frontend has those lists anyway.
 * Date-times are Swiss local time without offset ("2026-10-15T07:00:00").
 */
public record TaskDto(
        UUID id,
        long version,
        @Schema(types = {"string", "null"}, description = "SwissGarage order number") String taskNumber,
        TaskStatus status,
        CustomerDto customer,
        @Schema(types = {"object", "null"}, description = "Still open if empty") VehicleDto vehicle,
        @Schema(format = "date") LocalDate date,
        @Schema(type = "string", example = "08:00:00") LocalTime time,
        @Schema(example = "2026-10-15T09:00:00", description = "Until when the task takes its lift") LocalDateTime endAt,
        @Schema(types = {"string", "null"}, example = "2026-10-14T18:00:00", description = "Fahrzeug kommt früher") LocalDateTime arrivesEarlier,
        @Schema(types = {"string", "null"}, example = "2026-10-15T16:30:00", description = "fertig bis") LocalDateTime readyBy,
        @Schema(description = "Customer waits on site – a flag, not a status") boolean waitingCustomer,
        @Schema(types = {"string", "null"}, format = "uuid") UUID mechanicId,
        @Schema(types = {"string", "null"}, format = "uuid") UUID liftId,
        boolean tireChange,
        @Schema(types = {"string", "null"}) TireChangeKind tireChangeKind,
        boolean mfk,
        @Schema(types = {"string", "null"}, example = "2026-10-15T10:00:00") LocalDateTime mfkAppointment,
        @Schema(description = "Ticked service items, in the order of the service item list") List<UUID> serviceItemIds,
        @Schema(types = {"object", "null"}, description = "Empty = no parts needed") PartsOrderDto parts,
        @Schema(types = {"string", "null"}, description = "Further work as free text") String workDescription,
        @Schema(types = {"string", "null"}, description = "Internal notes") String notes,
        Instant createdAt,
        @Schema(types = {"string", "null"}, format = "uuid") UUID createdBy,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static TaskDto of(Task task) {
        Appointment a = task.getAppointment();
        TaskWork w = task.getWork();
        // getId() on a LAZY reference does not load it
        UUID mechanicId = task.getMechanic() == null ? null : task.getMechanic().getId();
        UUID liftId = task.getLift() == null ? null : task.getLift().getId();
        List<UUID> serviceItemIds = w.serviceItems().stream()
                .sorted(Comparator.comparingInt(ServiceItem::getSortOrder).thenComparing(ServiceItem::getName))
                .map(ServiceItem::getId)
                .toList();
        return new TaskDto(task.getId(), task.getVersion(), task.getTaskNumber(), task.getStatus(),
                CustomerDto.of(task.getCustomer()), task.getVehicle() == null ? null : VehicleDto.of(task.getVehicle()),
                a.date(), a.time(), a.end(), a.arrivesEarlier(), a.readyBy(), a.waitingCustomer(), mechanicId, liftId,
                w.tireChange(), w.tireChangeKind(), w.mfk(), w.mfkAppointment(), serviceItemIds,
                PartsOrderDto.of(w.parts()), w.description(), task.getNotes(),
                task.getCreatedAt(), task.getCreatedBy(), task.getUpdatedAt(), task.getUpdatedBy());
    }
}
