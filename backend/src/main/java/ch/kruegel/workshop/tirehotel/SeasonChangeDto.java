package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The season change overview (FB-21): the season shown and one entry per set to look at. */
public record SeasonChangeDto(
        @Schema(description = "The tyres going on now – SUMMER or WINTER") Season season,
        @Schema(description = "By then the change should be done") LocalDate deadline,
        @Schema(description = "Changes from this day on count for this season") LocalDate from,
        @Schema(description = "The deadline is over – who is still open forgot") boolean overdue,
        List<Entry> entries) {

    /** Where a set stands in the season */
    @Schema(name = "SeasonGroup")
    public enum Group {
        /** changed this season – one entry per vehicle */
        CHANGED,
        /** an open task with a tyre change for its vehicle */
        PLANNED,
        /** still in the hotel, no appointment – to be called */
        OPEN,
        /** not changed this season on purpose */
        ACKNOWLEDGED,
        /** in the hotel through a whole season of its own – sold the car? dispose of the tyres? */
        LONG_STORED
    }

    // named in the API – "Entry" alone says nothing; "Dto" makes every field required there
    @Schema(name = "SeasonChangeEntryDto")
    public record Entry(
            Group group,
            TireSetDto set,
            @Schema(types = {"string", "null"}, format = "date", description = "CHANGED: the day of the change") LocalDate changedOn,
            @Schema(types = {"object", "null"}, description = "PLANNED: the task") PlannedTask planned,
            @Schema(types = {"object", "null"}, description = "ACKNOWLEDGED: by whom, when, why") Ack ack,
            @Schema(description = "Summer and winter of the vehicle are both in the hotel – check") boolean bothStored) {
    }

    @Schema(name = "SeasonPlannedTaskDto")
    public record PlannedTask(
            UUID id,
            @Schema(types = {"string", "null"}) String taskNumber,
            @Schema(types = {"string", "null"}, format = "date", description = "Empty = no appointment yet") LocalDate date) {
    }

    @Schema(name = "SeasonAckDto")
    public record Ack(
            UUID id,
            @Schema(types = {"string", "null"}) String reason,
            @Schema(types = {"string", "null"}, format = "uuid") UUID by,
            Instant at) {

        static Ack of(TireSeasonAck ack) {
            return new Ack(ack.getId(), ack.getReason(), ack.getCreatedBy(), ack.getCreatedAt());
        }
    }
}
