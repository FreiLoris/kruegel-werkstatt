package ch.kruegel.workshop.appmodule;

import ch.kruegel.workshop.common.live.DataChanged;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

/** Which parts of the app the workshop uses (neutral 3): read by every device, changed in the settings. */
@Service
@Transactional
public class ModuleSettingsService {

    /** Every device rebuilds its menu right away */
    public static final String TOPIC = "modules";

    private final ModuleSettingsRepository repository;
    private final ApplicationEventPublisher events;

    ModuleSettingsService(ModuleSettingsRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public ModuleSettingsDto settings() {
        return dto(repository.theSettings());
    }

    public ModuleSettingsDto update(ModuleSettingsRequest request) {
        ModuleSettings settings = repository.theSettings();
        settings.checkVersion(request.version());
        Set<AppModule> off = EnumSet.noneOf(AppModule.class);
        off.addAll(request.off());
        settings.update(off);
        repository.flush();
        events.publishEvent(new DataChanged(TOPIC));
        return dto(settings);
    }

    private static ModuleSettingsDto dto(ModuleSettings settings) {
        return new ModuleSettingsDto(settings.getVersion(), Arrays.stream(AppModule.values())
                .map(m -> new ModuleDto(m, m.title(), m.description(), settings.isOn(m)))
                .toList());
    }
}
