package ch.kruegel.workshop.common.live;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Holds the open live connections of all browsers and distributes changes to them.
 *
 * <p>Technique: Server-Sent Events (SSE). The browser opens one connection
 * ({@code GET /api/live}) and the server writes a short message into it on every change.
 * If the connection drops, the browser re-establishes it.
 */
@Service
public class LiveUpdateService {

    private static final Logger log = LoggerFactory.getLogger(LiveUpdateService.class);

    /** After this time the server ends the connection; the browser reconnects immediately. */
    private static final Duration CONNECTION_LIFETIME = Duration.ofMinutes(30);

    // Thread-safe: connections come and go while messages are being sent.
    private final List<SseEmitter> connections = new CopyOnWriteArrayList<>();

    /** New live connection for a browser. */
    public SseEmitter connect() {
        SseEmitter connection = new SseEmitter(CONNECTION_LIFETIME.toMillis());
        connection.onCompletion(() -> connections.remove(connection));
        connection.onTimeout(connection::complete);
        connection.onError(error -> connections.remove(connection));
        connections.add(connection);

        // First message: tells the browser for sure that the connection is up.
        send(connection, SseEmitter.event().name("connected").data(""));
        return connection;
    }

    /**
     * Sends a change to all browsers – but only AFTER the transaction committed successfully.
     * If the transaction is rolled back nothing goes out (otherwise browsers would reload
     * data that does not exist).
     *
     * <p>{@code fallbackExecution}: if the event is published outside a transaction,
     * send it right away.
     */
    @TransactionalEventListener(fallbackExecution = true)
    public void onDataChanged(DataChanged change) {
        log.debug("Live update '{}' to {} connection(s)", change.topic(), connections.size());
        for (SseEmitter connection : connections) {
            send(connection, SseEmitter.event().name("change").data(change));
        }
    }

    /**
     * Regular heartbeat (SSE comment, ignored by the browser). Keeps the connection open
     * through proxies and detects browsers that disappeared without closing.
     */
    @Scheduled(fixedRate = 25_000)
    void heartbeat() {
        for (SseEmitter connection : connections) {
            send(connection, SseEmitter.event().comment("ping"));
        }
    }

    int connectionCount() {
        return connections.size();
    }

    private void send(SseEmitter connection, SseEmitter.SseEventBuilder message) {
        try {
            connection.send(message);
        } catch (IOException | IllegalStateException e) {
            // Browser is gone (tab closed, Wi-Fi lost) → clean up the connection.
            connections.remove(connection);
        }
    }
}
