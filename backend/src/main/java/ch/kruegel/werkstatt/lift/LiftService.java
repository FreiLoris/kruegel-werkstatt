package ch.kruegel.werkstatt.lift;

import ch.kruegel.werkstatt.common.live.DatenGeaendert;
import ch.kruegel.werkstatt.common.web.EingabeFehlerException;
import ch.kruegel.werkstatt.common.web.NichtGefundenException;
import ch.kruegel.werkstatt.common.web.RegelVerletztException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

/** Verwaltung der Lifts. Aufbau wie {@code MitarbeiterService}. */
@Service
@Transactional
public class LiftService {

    static final String BEREICH = "lifts";

    private final LiftRepository repository;
    private final ApplicationEventPublisher events;

    LiftService(LiftRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<LiftDto> alle(boolean inklusiveInaktive) {
        List<Lift> liste = inklusiveInaktive
                ? repository.findAllByOrderByReihenfolgeAscNameAsc()
                : repository.findByAktivTrueOrderByReihenfolgeAscNameAsc();
        return liste.stream().map(LiftDto::von).toList();
    }

    public LiftDto anlegen(LiftEingabe eingabe) {
        Lift neu = new Lift(eingabe.name(), repository.naechsteReihenfolge());
        if (repository.existsByAktivTrueAndNameIgnoreCase(neu.getName())) {
            throw nameVergeben(neu.getName());
        }
        return gespeichert(repository.save(neu));
    }

    public LiftDto umbenennen(UUID id, LiftEingabe eingabe) {
        if (eingabe.version() == null) {
            throw new EingabeFehlerException("version", "muss beim Bearbeiten angegeben werden");
        }
        Lift lift = finden(id);
        lift.pruefeVersion(eingabe.version());
        lift.umbenennen(eingabe.name());
        if (lift.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCaseAndIdNot(lift.getName(), id)) {
            throw nameVergeben(lift.getName());
        }
        return gespeichert(lift);
    }

    /**
     * Lift stilllegen: keine eigene Spalte mehr, nicht mehr wählbar.
     * Der letzte aktive Lift bleibt – ohne Lift könnte kein Termin mehr eingeteilt werden.
     */
    public LiftDto deaktivieren(UUID id) {
        Lift lift = finden(id);
        if (lift.isAktiv() && repository.countByAktivTrue() <= 1) {
            throw new RegelVerletztException("Mindestens ein Lift muss in Betrieb bleiben.");
        }
        lift.deaktivieren();
        return gespeichert(lift);
    }

    public LiftDto aktivieren(UUID id) {
        Lift lift = finden(id);
        if (!lift.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCase(lift.getName())) {
            throw nameVergeben(lift.getName());
        }
        lift.aktivieren();
        return gespeichert(lift);
    }

    /** Erste ID = ganz links. Nicht genannte folgen dahinter in bisheriger Reihenfolge. */
    public List<LiftDto> reihenfolgeSetzen(List<UUID> ids) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new EingabeFehlerException("ids", "enthält denselben Lift mehrfach");
        }
        List<Lift> neueReihenfolge = new ArrayList<>(ids.stream().map(this::finden).toList());
        repository.findAllByOrderByReihenfolgeAscNameAsc().stream()
                .filter(l -> !ids.contains(l.getId()))
                .forEach(neueReihenfolge::add);

        for (int i = 0; i < neueReihenfolge.size(); i++) {
            neueReihenfolge.get(i).verschieben(i);
        }
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return alle(true);
    }

    private Lift finden(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NichtGefundenException("Lift", id));
    }

    /** flush → Version stimmt in der Antwort; Live-Update an alle Geräte (nach Commit). */
    private LiftDto gespeichert(Lift lift) {
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return LiftDto.von(lift);
    }

    private static EingabeFehlerException nameVergeben(String name) {
        return new EingabeFehlerException("name", "'" + name + "' gibt es bereits");
    }
}
