package ch.kruegel.werkstatt.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Zentrale Uhr der Anwendung.
 *
 * <p>Regel: Code fragt die aktuelle Zeit nie mit {@code LocalDate.now()} ab, sondern
 * immer über diese {@link Clock} ({@code LocalDate.now(clock)}). Vorteile:
 * <ul>
 *   <li>Die Zeitzone ist immer Europe/Zurich – egal, wie der Server/Container eingestellt ist.</li>
 *   <li>In Tests lässt sich die Zeit festlegen (z.B. "heute ist der 24.12.").</li>
 * </ul>
 *
 * <p>Gespeichert werden Zeitpunkte als {@link java.time.Instant} (UTC). Fachliche Daten
 * wie ein Termin am 15.10. um 08:00 als {@code LocalDate}/{@code LocalTime}.
 */
@Configuration(proxyBeanMethods = false)
public class TimeConfig {

    public static final ZoneId ZEITZONE = ZoneId.of("Europe/Zurich");

    @Bean
    Clock clock() {
        return Clock.system(ZEITZONE);
    }
}
