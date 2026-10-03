package ch.kruegel.werkstatt.mitarbeiter;

import ch.kruegel.werkstatt.common.live.DatenGeaendert;
import ch.kruegel.werkstatt.common.persistence.Reihenfolge;
import ch.kruegel.werkstatt.common.web.EingabeFehlerException;
import ch.kruegel.werkstatt.common.web.NichtGefundenException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Geschäftslogik rund um Mitarbeiter. Jede öffentliche Methode ist eine Transaktion:
 * Entweder wird alles gespeichert oder nichts.
 */
@Service
@Transactional
public class MitarbeiterService {

    static final String BEREICH = "mitarbeiter";

    private final MitarbeiterRepository repository;
    private final ApplicationEventPublisher events;

    MitarbeiterService(MitarbeiterRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<MitarbeiterDto> alle(boolean inklusiveInaktive) {
        List<Mitarbeiter> liste = inklusiveInaktive
                ? repository.findAllByOrderByReihenfolgeAscNameAsc()
                : repository.findByAktivTrueOrderByReihenfolgeAscNameAsc();
        return liste.stream().map(MitarbeiterDto::von).toList();
    }

    @Transactional(readOnly = true)
    public MitarbeiterDto laden(UUID id) {
        return MitarbeiterDto.von(finden(id));
    }

    public MitarbeiterDto anlegen(MitarbeiterEingabe eingabe) {
        MitarbeiterStammdaten daten = eingabe.alsStammdaten();
        if (repository.existsByAktivTrueAndNameIgnoreCase(daten.name())) {
            throw nameVergeben(daten.name());
        }
        Mitarbeiter neu = repository.save(new Mitarbeiter(daten, repository.naechsteReihenfolge()));
        return gespeichert(neu);
    }

    public MitarbeiterDto aendern(UUID id, MitarbeiterEingabe eingabe) {
        if (eingabe.version() == null) {
            throw new EingabeFehlerException("version", "muss beim Bearbeiten angegeben werden");
        }
        Mitarbeiter mitarbeiter = finden(id);
        mitarbeiter.pruefeVersion(eingabe.version());

        MitarbeiterStammdaten daten = eingabe.alsStammdaten();
        if (mitarbeiter.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCaseAndIdNot(daten.name(), id)) {
            throw nameVergeben(daten.name());
        }
        mitarbeiter.aendern(daten);
        return gespeichert(mitarbeiter);
    }

    /** Person hat den Betrieb verlassen. Bleibt erhalten, erscheint aber in keiner Auswahl mehr. */
    public MitarbeiterDto deaktivieren(UUID id) {
        Mitarbeiter mitarbeiter = finden(id);
        mitarbeiter.deaktivieren();
        return gespeichert(mitarbeiter);
    }

    public MitarbeiterDto aktivieren(UUID id) {
        Mitarbeiter mitarbeiter = finden(id);
        if (!mitarbeiter.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCase(mitarbeiter.getName())) {
            throw nameVergeben(mitarbeiter.getName());
        }
        mitarbeiter.aktivieren();
        return gespeichert(mitarbeiter);
    }

    /**
     * Setzt die Reihenfolge (Pinnwand-Spalten, Listen) neu: erste ID = ganz vorne.
     * Personen, die nicht in der Liste stehen, folgen dahinter in ihrer bisherigen Reihenfolge.
     */
    public List<MitarbeiterDto> reihenfolgeSetzen(List<UUID> ids) {
        Reihenfolge.neuSetzen(repository.findAllByOrderByReihenfolgeAscNameAsc(), ids, "Mitarbeiter");
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return alle(true);
    }

    private Mitarbeiter finden(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NichtGefundenException("Mitarbeiter", id));
    }

    /**
     * Schreibt die Änderung sofort in die Datenbank (flush), damit die zurückgegebene
     * {@code version} bereits hochgezählt ist – das Gerät braucht sie fürs nächste Bearbeiten.
     * Meldet die Änderung an alle anderen Geräte (wird nach dem Commit verschickt).
     */
    private MitarbeiterDto gespeichert(Mitarbeiter mitarbeiter) {
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return MitarbeiterDto.von(mitarbeiter);
    }

    private static EingabeFehlerException nameVergeben(String name) {
        return new EingabeFehlerException("name", "'" + name + "' gibt es bereits bei den aktiven Mitarbeitern");
    }
}
