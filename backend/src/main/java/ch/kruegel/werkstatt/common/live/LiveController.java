package ch.kruegel.werkstatt.common.live;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class LiveController {

    private final LiveUpdateService liveUpdates;

    LiveController(LiveUpdateService liveUpdates) {
        this.liveUpdates = liveUpdates;
    }

    @Operation(
            summary = "Live-Verbindung für Änderungen (Server-Sent Events)",
            description = """
                    Ereignisse: 'verbunden' (direkt nach dem Verbinden) und 'aenderung' \
                    (Daten eines Bereichs haben sich geändert → neu laden).""")
    @ApiResponse(
            responseCode = "200",
            content = @Content(
                    mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
                    schema = @Schema(implementation = DatenGeaendert.class)))
    @GetMapping(path = "/api/live", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter live() {
        return liveUpdates.verbinden();
    }
}
