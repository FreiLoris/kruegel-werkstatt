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

    /** Für neue Einträge: ans Ende der Liste setzen. */
    @Query("select coalesce(max(m.reihenfolge), -1) + 1 from Mitarbeiter m")
    int naechsteReihenfolge();
}
