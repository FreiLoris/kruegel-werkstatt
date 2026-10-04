package ch.kruegel.workshop.company;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/** Name, address and logo of the workshop. */
@Service
@Transactional
public class CompanyService {

    static final String TOPIC = "company";

    private final CompanyProfileRepository repository;
    private final CompanyLogoStore logos;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    CompanyService(CompanyProfileRepository repository, CompanyLogoStore logos, ApplicationEventPublisher events, Clock clock) {
        this.repository = repository;
        this.logos = logos;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CompanyDto get() {
        return CompanyDto.of(profile(), logos.info().orElse(null));
    }

    public CompanyDto update(CompanyRequest request) {
        CompanyProfile profile = profile();
        profile.checkVersion(request.version());
        profile.update(request.toDetails());
        repository.flush();
        return changed(profile);
    }

    @Transactional(readOnly = true)
    Optional<CompanyLogoStore.Logo> logo() {
        return logos.load();
    }

    /** Takes PNG, JPEG, WebP or SVG up to 1 MB – recognised by the content, not the file name. */
    public CompanyDto uploadLogo(byte[] data) {
        // User-facing messages, hence German
        if (data.length == 0) {
            throw new InvalidInputException("file", "Die Datei ist leer.");
        }
        if (data.length > CompanyLogoStore.MAX_BYTES) {
            throw new InvalidInputException("file", "Das Logo darf höchstens 1 MB gross sein.");
        }
        String type = CompanyLogoStore.detectType(data);
        if (type == null) {
            throw new InvalidInputException("file", "Bitte ein Bild als PNG, JPG, WebP oder SVG hochladen.");
        }
        logos.save(data, type, Instant.now(clock));
        return changed(profile());
    }

    public CompanyDto deleteLogo() {
        logos.delete();
        return changed(profile());
    }

    private CompanyProfile profile() {
        return repository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Company profile missing – migration V12 creates it"));
    }

    private CompanyDto changed(CompanyProfile profile) {
        events.publishEvent(new DataChanged(TOPIC));
        return CompanyDto.of(profile, logos.info().orElse(null));
    }
}
