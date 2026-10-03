package ch.kruegel.werkstatt.lift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Datenbankzugriff für Lifts. */
public interface LiftRepository extends JpaRepository<Lift, UUID> {

    /** Alle (auch stillgelegte), in fester Reihenfolge – für die Verwaltung. */
    List<Lift> findAllByOrderByReihenfolgeAscNameAsc();

    /** Nur aktive, in fester Reihenfolge – für Spalten und Auswahllisten. */
    List<Lift> findByAktivTrueOrderByReihenfolgeAscNameAsc();

    boolean existsByAktivTrueAndNameIgnoreCase(String name);

    boolean existsByAktivTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    long countByAktivTrue();

    @Query("select coalesce(max(l.reihenfolge), -1) + 1 from Lift l")
    int naechsteReihenfolge();
}
