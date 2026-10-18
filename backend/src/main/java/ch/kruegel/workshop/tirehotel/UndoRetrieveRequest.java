package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/** Retrieved by mistake: back into the hotel as if it had not happened (UX G-13). */
public record UndoRetrieveRequest(
        @Schema(description = "The place it lay on – empty = in the hotel without a place") UUID placeId) {
}
