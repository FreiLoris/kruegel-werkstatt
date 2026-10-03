package ch.kruegel.werkstatt.mitarbeiter;

import ch.kruegel.werkstatt.common.person.PersonVerzeichnis;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Personen für «Wer bin ich?» sind die aktiven Mitarbeiter. */
@Component
@Transactional(readOnly = true)
class MitarbeiterVerzeichnis implements PersonVerzeichnis {

    private final MitarbeiterRepository repository;

    MitarbeiterVerzeichnis(MitarbeiterRepository repository) {
        this.repository = repository;
    }

    @Override
    public boolean istAktiv(UUID id) {
        return repository.existsByIdAndAktivTrue(id);
    }

    @Override
    public boolean gibtEsAktive() {
        return repository.existsByAktivTrue();
    }
}
