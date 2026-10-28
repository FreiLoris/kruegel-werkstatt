package ch.kruegel.workshop.screenlock;

import ch.kruegel.workshop.common.live.DataChanged;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The screen lock setting (FB-29): read by every device, changed in the settings. */
@Service
@Transactional
public class ScreenLockService {

    public static final String TOPIC = "screen-lock-settings";

    private final ScreenLockSettingsRepository repository;
    private final ApplicationEventPublisher events;

    ScreenLockService(ScreenLockSettingsRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public ScreenLockSettingsDto settings() {
        return ScreenLockSettingsDto.of(theSettings());
    }

    public ScreenLockSettingsDto update(ScreenLockSettingsRequest request) {
        ScreenLockSettings settings = theSettings();
        settings.checkVersion(request.version());
        settings.update(request.lockMinutes());
        repository.flush();
        // every device takes the new minutes right away
        events.publishEvent(new DataChanged(TOPIC));
        return ScreenLockSettingsDto.of(settings);
    }

    private ScreenLockSettings theSettings() {
        return repository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Screen lock settings missing – migration V51 creates them"));
    }
}
