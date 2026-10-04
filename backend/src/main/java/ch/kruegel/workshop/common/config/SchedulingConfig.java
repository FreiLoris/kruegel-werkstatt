package ch.kruegel.workshop.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Turns on scheduled tasks ({@code @Scheduled}),
 * e.g. the heartbeat of the live connections.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class SchedulingConfig {
}
