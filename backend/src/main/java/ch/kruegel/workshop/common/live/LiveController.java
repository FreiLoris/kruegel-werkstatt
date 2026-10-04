package ch.kruegel.workshop.common.live;

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
            summary = "Live connection for changes (Server-Sent Events)",
            description = """
                    Events: 'connected' (right after connecting) and 'change' \
                    (data of a topic has changed → reload).""")
    @ApiResponse(
            responseCode = "200",
            content = @Content(
                    mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
                    schema = @Schema(implementation = DataChanged.class)))
    @GetMapping(path = "/api/live", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter live() {
        return liveUpdates.connect();
    }
}
