package ch.kruegel.werkstatt.common.live;

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
 * Hält die offenen Live-Verbindungen aller Browser und verteilt Änderungen an sie.
 *
 * <p>Technik: Server-Sent Events (SSE). Der Browser öffnet einmal eine Verbindung
 * ({@code GET /api/live}) und der Server schreibt bei jeder Änderung eine kurze Nachricht
 * hinein. Bricht die Verbindung ab, baut der Browser sie von selbst wieder auf.
 */
@Service
public class LiveUpdateService {

    private static final Logger log = LoggerFactory.getLogger(LiveUpdateService.class);

    /** Nach dieser Zeit beendet der Server die Verbindung; der Browser verbindet sich sofort neu. */
    private static final Duration VERBINDUNGSDAUER = Duration.ofMinutes(30);

    // Thread-sicher: Verbindungen kommen und gehen, während gleichzeitig verschickt wird.
    private final List<SseEmitter> verbindungen = new CopyOnWriteArrayList<>();

    /** Neue Live-Verbindung für einen Browser. */
    public SseEmitter verbinden() {
        SseEmitter verbindung = new SseEmitter(VERBINDUNGSDAUER.toMillis());
        verbindung.onCompletion(() -> verbindungen.remove(verbindung));
        verbindung.onTimeout(verbindung::complete);
        verbindung.onError(fehler -> verbindungen.remove(verbindung));
        verbindungen.add(verbindung);

        // Erste Nachricht: Browser weiss damit sicher, dass die Verbindung steht.
        senden(verbindung, SseEmitter.event().name("verbunden").data(""));
        return verbindung;
    }

    /**
     * Verteilt eine Änderung an alle Browser – aber erst NACHDEM die Transaktion erfolgreich
     * abgeschlossen ist. Wird die Transaktion zurückgerollt, geht nichts raus (sonst würden
     * Browser Daten neu laden, die es gar nicht gibt).
     *
     * <p>{@code fallbackExecution}: Wird das Ereignis ausserhalb einer Transaktion
     * veröffentlicht, sofort verschicken.
     */
    @TransactionalEventListener(fallbackExecution = true)
    public void beiAenderung(DatenGeaendert aenderung) {
        log.debug("Live-Update '{}' an {} Verbindung(en)", aenderung.bereich(), verbindungen.size());
        for (SseEmitter verbindung : verbindungen) {
            senden(verbindung, SseEmitter.event().name("aenderung").data(aenderung));
        }
    }

    /**
     * Regelmässiges Lebenszeichen (SSE-Kommentar, vom Browser ignoriert). Hält die Verbindung
     * über Proxys hinweg offen und entdeckt Browser, die ohne Abmelden verschwunden sind.
     */
    @Scheduled(fixedRate = 25_000)
    void lebenszeichen() {
        for (SseEmitter verbindung : verbindungen) {
            senden(verbindung, SseEmitter.event().comment("ping"));
        }
    }

    int anzahlVerbindungen() {
        return verbindungen.size();
    }

    private void senden(SseEmitter verbindung, SseEmitter.SseEventBuilder nachricht) {
        try {
            verbindung.send(nachricht);
        } catch (IOException | IllegalStateException e) {
            // Browser ist weg (Tab geschlossen, WLAN weg) → Verbindung aufräumen.
            verbindungen.remove(verbindung);
        }
    }
}
