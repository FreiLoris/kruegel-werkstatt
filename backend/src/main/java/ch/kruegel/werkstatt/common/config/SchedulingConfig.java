package ch.kruegel.werkstatt.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Schaltet zeitgesteuerte Aufgaben ({@code @Scheduled}) ein,
 * z.B. das Lebenszeichen der Live-Verbindungen.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class SchedulingConfig {
}
