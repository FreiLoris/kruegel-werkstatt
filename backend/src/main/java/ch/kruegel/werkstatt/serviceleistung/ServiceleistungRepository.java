package ch.kruegel.werkstatt.serviceleistung;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Datenbankzugriff für Serviceleistungen. */
public interface ServiceleistungRepository extends JpaRepository<Serviceleistung, UUID> {

    /** Alle (auch nicht mehr angebotene), in fester Reihenfolge – für die Verwaltung. */
    List<Serviceleistung> findAllByOrderByReihenfolgeAscNameAsc();

    /** Nur aktive – für die Checkboxen im Auftrag. */
    List<Serviceleistung> findByAktivTrueOrderByReihenfolgeAscNameAsc();

    boolean existsByAktivTrueAndNameIgnoreCase(String name);

    boolean existsByAktivTrueAndNameIgnoreCaseAndIdNot(String name, UUID id);

    @Query("select coalesce(max(s.reihenfolge), -1) + 1 from Serviceleistung s")
    int naechsteReihenfolge();
}
