package ch.kruegel.werkstatt.common;

import ch.kruegel.werkstatt.common.config.TimeConfig;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/**
 * Uhr für Tests: steht still, bis man sie mit {@link #vorspulen(Duration)} weiterdreht.
 */
public class TestClock extends Clock {

    private Instant jetzt;

    public TestClock(Instant start) {
        this.jetzt = start;
    }

    public void stellen(Instant zeitpunkt) {
        jetzt = zeitpunkt;
    }

    public void vorspulen(Duration dauer) {
        jetzt = jetzt.plus(dauer);
    }

    @Override
    public Instant instant() {
        return jetzt;
    }

    @Override
    public ZoneId getZone() {
        return TimeConfig.ZEITZONE;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        throw new UnsupportedOperationException("TestClock läuft immer in " + TimeConfig.ZEITZONE);
    }
}
