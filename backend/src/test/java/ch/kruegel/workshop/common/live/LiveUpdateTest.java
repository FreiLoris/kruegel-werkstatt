package ch.kruegel.workshop.common.live;

import ch.kruegel.workshop.TestcontainersConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Tests the live connection through a real HTTP server – the way a browser uses it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class LiveUpdateTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private TransactionTemplate transaction;

    @Autowired
    private LiveUpdateService liveUpdates;

    private final HttpClient http = HttpClient.newHttpClient();
    private final BlockingQueue<String> receivedLines = new LinkedBlockingQueue<>();
    private CompletableFuture<HttpResponse<Stream<String>>> connection;

    @BeforeEach
    void connect() {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/live")).build();
        connection = http.sendAsync(request, HttpResponse.BodyHandlers.ofLines());
        // Collect lines in the background as long as the connection is open
        connection.thenAccept(response -> response.body().forEach(receivedLines::add));
        await().atMost(5, TimeUnit.SECONDS).until(() -> liveUpdates.connectionCount() > 0);
    }

    @AfterEach
    void disconnect() {
        connection.cancel(true);
    }

    @Test
    void reportsConnectedRightAfterConnecting() throws InterruptedException {
        assertThat(nextLineStartingWith("event:")).isEqualTo("event:connected");
    }

    @Test
    void sendsChangeAfterSuccessfulTransaction() throws InterruptedException {
        transaction.executeWithoutResult(status -> events.publishEvent(new DataChanged("employees")));

        assertThat(nextLineStartingWith("data:")).contains("\"topic\":\"employees\"");
    }

    @Test
    void sendsNothingForRolledBackTransaction() throws InterruptedException {
        transaction.executeWithoutResult(status -> {
            events.publishEvent(new DataChanged("rolled-back"));
            status.setRollbackOnly();
        });
        transaction.executeWithoutResult(status -> events.publishEvent(new DataChanged("committed")));

        // The first change that arrives must be the committed one.
        assertThat(nextLineStartingWith("data:")).contains("committed");
    }

    /** Waits (max. 5 s) for the next line starting with the prefix. */
    private String nextLineStartingWith(String prefix) throws InterruptedException {
        long end = System.currentTimeMillis() + 5_000;
        while (System.currentTimeMillis() < end) {
            String line = receivedLines.poll(100, TimeUnit.MILLISECONDS);
            if (line != null && line.startsWith(prefix) && !line.equals("data:")) {
                return line;
            }
        }
        throw new AssertionError("No line with '" + prefix + "' received");
    }
}
