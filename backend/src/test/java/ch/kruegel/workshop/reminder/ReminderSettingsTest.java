package ch.kruegel.workshop.reminder;

import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class ReminderSettingsTest {

    private static final LocalTime FOUR = LocalTime.of(16, 0);
    private static final String KRUEGEL = "Krügel Fahrzeugtechnik";
    private static final String RENAMED = "Fahrzeugtechnik Krügel GmbH";

    @Test
    void withoutAnOwnSender_itFollowsTheCompanyName() {
        ReminderSettings settings = new ReminderSettings();
        assertThat(settings.hasOwnSender()).isFalse();
        assertThat(settings.getSmsSender(KRUEGEL)).isEqualTo("Kruegel");
        assertThat(settings.getSmsSender(RENAMED)).isEqualTo("Fahrzeugtec");
    }

    @Test
    void aKeptSender_evenTheOneTheNameGives_staysWhenSavedUnchangedAndTheNameChanges() {
        ReminderSettings settings = new ReminderSettings();
        // as V60 keeps it for an installation in use
        settings.update(false, FOUR, null, "Kruegel");
        // the form saved without touching the sender: not sent
        settings.update(true, FOUR, null, null);
        assertThat(settings.hasOwnSender()).isTrue();
        assertThat(settings.getSmsSender(RENAMED)).isEqualTo("Kruegel");
    }

    @Test
    void emptiedTheCompanyNameAgain() {
        ReminderSettings settings = new ReminderSettings();
        settings.update(false, FOUR, null, "Muster");
        settings.update(false, FOUR, null, " ");
        assertThat(settings.hasOwnSender()).isFalse();
        assertThat(settings.getSmsSender(KRUEGEL)).isEqualTo("Kruegel");
    }
}
