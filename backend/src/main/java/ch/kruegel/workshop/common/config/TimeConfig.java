package ch.kruegel.workshop.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * The application's central clock.
 *
 * <p>Rule: code never asks for the current time with {@code LocalDate.now()}, always through
 * this {@link Clock} ({@code LocalDate.now(clock)}). Benefits:
 * <ul>
 *   <li>The time zone is always Europe/Zurich – regardless of how the server/container is set up.</li>
 *   <li>Tests can fix the time (e.g. "today is December 24").</li>
 * </ul>
 *
 * <p>Points in time are stored as {@link java.time.Instant} (UTC). Business dates such as
 * an appointment on Oct 15 at 08:00 as {@code LocalDate}/{@code LocalTime}.
 */
@Configuration(proxyBeanMethods = false)
public class TimeConfig {

    public static final ZoneId TIME_ZONE = ZoneId.of("Europe/Zurich");

    @Bean
    Clock clock() {
        return Clock.system(TIME_ZONE);
    }
}
