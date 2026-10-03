package ch.kruegel.werkstatt.mitarbeiter;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/**
 * Datenbankzugriff für Mitarbeiter. Spring Data erzeugt die Abfragen aus den Methodennamen.
 */
public interface MitarbeiterRepository extends JpaRepository<Mitarbeiter, UUID> {

    /** Alle (auch ehemalige), in der festen Reihenfolge – für die Verwaltung. */
    List<Mitarbeiter> findAllByOrderByReihenfolgeAscNameAsc();

    /** Nur aktive, in der festen Reihenfolge – für alle Auswahllisten. */
    List<Mitarbeiter> findByAktivTrueOrderByReihenfolgeAscNameAsc();

    /** Gibt es schon einen aktiven Mitarbeiter mit diesem Namen (Gross-/Kleinschreibung egal)? */
    boolean existsByAktivTrueAndNameIgnoreCase(String name);

    /** Wie oben, aber ohne die Person selbst (beim Bearbeiten). */
    boolean existsByAktivTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    /** Ist diese Person aktiv? (Prüfung des Headers «X-Person») */
    boolean existsByIdAndAktivTrue(UUID id);

    /** Gibt es überhaupt aktive Personen? (Nein = Ersteinrichtung) */
    boolean existsByAktivTrue();

    /** Für neue Einträge: ans Ende der Liste setzen. */
    @Query("select coalesce(max(m.reihenfolge), -1) + 1 from Mitarbeiter m")
    int naechsteReihenfolge();
}
