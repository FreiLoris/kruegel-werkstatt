package ch.kruegel.werkstatt.serviceleistung;

import ch.kruegel.werkstatt.common.live.DatenGeaendert;
import ch.kruegel.werkstatt.common.persistence.Reihenfolge;
import ch.kruegel.werkstatt.common.web.EingabeFehlerException;
import ch.kruegel.werkstatt.common.web.NichtGefundenException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Verwaltung der Serviceleistungen. Aufbau wie {@code LiftService}. */
@Service
@Transactional
public class ServiceleistungService {

    static final String BEREICH = "serviceleistungen";

    private final ServiceleistungRepository repository;
    private final ApplicationEventPublisher events;

    ServiceleistungService(ServiceleistungRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<ServiceleistungDto> alle(boolean inklusiveInaktive) {
        List<Serviceleistung> liste = inklusiveInaktive
                ? repository.findAllByOrderByReihenfolgeAscNameAsc()
                : repository.findByAktivTrueOrderByReihenfolgeAscNameAsc();
        return liste.stream().map(ServiceleistungDto::von).toList();
    }

    public ServiceleistungDto anlegen(ServiceleistungEingabe eingabe) {
        Serviceleistung neu = new Serviceleistung(eingabe.name(), repository.naechsteReihenfolge());
        if (repository.existsByAktivTrueAndNameIgnoreCase(neu.getName())) {
            throw nameVergeben(neu.getName());
        }
        return gespeichert(repository.save(neu));
    }

    public ServiceleistungDto umbenennen(UUID id, ServiceleistungEingabe eingabe) {
        if (eingabe.version() == null) {
            throw new EingabeFehlerException("version", "muss beim Bearbeiten angegeben werden");
        }
        Serviceleistung leistung = finden(id);
        leistung.pruefeVersion(eingabe.version());
        // Erst prüfen, dann ändern: Die Prüf-Abfrage würde eine schon geänderte Entity vorher
        // in die DB schreiben (Hibernate "Auto-Flush") – und dann schlägt der Unique-Index zu.
        String name = eingabe.name().strip();
        if (leistung.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCaseAndIdNot(name, id)) {
            throw nameVergeben(name);
        }
        leistung.umbenennen(name);
        return gespeichert(leistung);
    }

    /** Wird nicht mehr angeboten: erscheint nicht mehr als Checkbox im Auftrag. */
    public ServiceleistungDto deaktivieren(UUID id) {
        Serviceleistung leistung = finden(id);
        leistung.deaktivieren();
        return gespeichert(leistung);
    }

    public ServiceleistungDto aktivieren(UUID id) {
        Serviceleistung leistung = finden(id);
        if (!leistung.isAktiv() && repository.existsByAktivTrueAndNameIgnoreCase(leistung.getName())) {
            throw nameVergeben(leistung.getName());
        }
        leistung.aktivieren();
        return gespeichert(leistung);
    }

    /** Erste ID = ganz oben (Reihenfolge der Checkboxen und auf dem Auftragszettel). */
    public List<ServiceleistungDto> reihenfolgeSetzen(List<UUID> ids) {
        Reihenfolge.neuSetzen(repository.findAllByOrderByReihenfolgeAscNameAsc(), ids, "Serviceleistung");
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return alle(true);
    }

    private Serviceleistung finden(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NichtGefundenException("Serviceleistung", id));
    }

    /** flush → Version stimmt in der Antwort; Live-Update an alle Geräte (nach Commit). */
    private ServiceleistungDto gespeichert(Serviceleistung leistung) {
        repository.flush();
        events.publishEvent(new DatenGeaendert(BEREICH));
        return ServiceleistungDto.von(leistung);
    }

    private static EingabeFehlerException nameVergeben(String name) {
        return new EingabeFehlerException("name", "'" + name + "' gibt es bereits");
    }
}
