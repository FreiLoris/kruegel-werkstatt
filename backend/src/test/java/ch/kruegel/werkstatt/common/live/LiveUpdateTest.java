package ch.kruegel.werkstatt.common.live;

import ch.kruegel.werkstatt.TestcontainersConfiguration;
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
 * Prüft die Live-Verbindung über einen echten HTTP-Server – so wie ein Browser sie nutzt.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class LiveUpdateTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private TransactionTemplate transaktion;

    @Autowired
    private LiveUpdateService liveUpdates;

    private final HttpClient http = HttpClient.newHttpClient();
    private final BlockingQueue<String> empfangeneZeilen = new LinkedBlockingQueue<>();
    private CompletableFuture<HttpResponse<Stream<String>>> verbindung;

    @BeforeEach
    void verbinden() {
        HttpRequest anfrage = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/live")).build();
        verbindung = http.sendAsync(anfrage, HttpResponse.BodyHandlers.ofLines());
        // Zeilen im Hintergrund einsammeln, solange die Verbindung offen ist
        verbindung.thenAccept(antwort -> antwort.body().forEach(empfangeneZeilen::add));
        await().atMost(5, TimeUnit.SECONDS).until(() -> liveUpdates.anzahlVerbindungen() > 0);
    }

    @AfterEach
    void trennen() {
        verbindung.cancel(true);
    }

    @Test
    void meldetSichDirektNachDemVerbindenMitVerbunden() throws InterruptedException {
        assertThat(naechsteZeileMit("event:")).isEqualTo("event:verbunden");
    }

    @Test
    void verschicktAenderungNachErfolgreicherTransaktion() throws InterruptedException {
        transaktion.executeWithoutResult(status -> events.publishEvent(new DatenGeaendert("mitarbeiter")));

        assertThat(naechsteZeileMit("data:")).contains("\"bereich\":\"mitarbeiter\"");
    }

    @Test
    void verschicktNichtsBeiZurueckgerollterTransaktion() throws InterruptedException {
        transaktion.executeWithoutResult(status -> {
            events.publishEvent(new DatenGeaendert("zurueckgerollt"));
            status.setRollbackOnly();
        });
        transaktion.executeWithoutResult(status -> events.publishEvent(new DatenGeaendert("gespeichert")));

        // Die erste Änderung, die ankommt, muss die gespeicherte sein.
        assertThat(naechsteZeileMit("data:")).contains("gespeichert");
    }

    /** Wartet (max. 5 s) auf die nächste Zeile, die mit dem Präfix beginnt. */
    private String naechsteZeileMit(String praefix) throws InterruptedException {
        long ende = System.currentTimeMillis() + 5_000;
        while (System.currentTimeMillis() < ende) {
            String zeile = empfangeneZeilen.poll(100, TimeUnit.MILLISECONDS);
            if (zeile != null && zeile.startsWith(praefix) && !zeile.equals("data:")) {
                return zeile;
            }
        }
        throw new AssertionError("Keine Zeile mit '" + praefix + "' empfangen");
    }
}
