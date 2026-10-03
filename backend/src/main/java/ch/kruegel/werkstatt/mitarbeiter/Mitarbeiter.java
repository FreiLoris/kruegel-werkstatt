package ch.kruegel.werkstatt.mitarbeiter;

import ch.kruegel.werkstatt.common.persistence.BaseEntity;
import ch.kruegel.werkstatt.common.persistence.Sortierbar;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.time.LocalDate;

/**
 * Eine Person, die im Betrieb arbeitet (oder gearbeitet hat).
 *
 * <p>Angelegt und geändert wird immer über {@link MitarbeiterStammdaten} – dort sind die
 * Regeln geprüft. Ehemalige werden {@linkplain #deaktivieren() deaktiviert}, nicht gelöscht,
 * damit alte Aufträge und Notizen ihren Namen behalten.
 */
@Entity
public class Mitarbeiter extends BaseEntity implements Sortierbar {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rolle rolle;

    @Column(nullable = false)
    private String farbe;

    private LocalDate geburtstag;

    private int ferienanspruch;

    private boolean alsMechanikerWaehlbar;

    private boolean fuerAufgabenWaehlbar;

    private boolean pinnwandSpalte;

    private boolean aktiv;

    private int reihenfolge;

    protected Mitarbeiter() {
        // für JPA
    }

    public Mitarbeiter(MitarbeiterStammdaten daten, int reihenfolge) {
        uebernehmen(daten);
        this.aktiv = true;
        this.reihenfolge = reihenfolge;
    }

    /** Ändert alle frei änderbaren Angaben auf einmal. */
    public void aendern(MitarbeiterStammdaten daten) {
        uebernehmen(daten);
    }

    /** Person hat den Betrieb verlassen: erscheint in keiner Auswahl mehr, bleibt aber erhalten. */
    public void deaktivieren() {
        this.aktiv = false;
    }

    public void aktivieren() {
        this.aktiv = true;
    }

    @Override
    public void verschieben(int neueReihenfolge) {
        this.reihenfolge = neueReihenfolge;
    }

    private void uebernehmen(MitarbeiterStammdaten daten) {
        this.name = daten.name();
        this.rolle = daten.rolle();
        this.farbe = daten.farbe();
        this.geburtstag = daten.geburtstag();
        this.ferienanspruch = daten.ferienanspruch();
        this.alsMechanikerWaehlbar = daten.alsMechanikerWaehlbar();
        this.fuerAufgabenWaehlbar = daten.fuerAufgabenWaehlbar();
        this.pinnwandSpalte = daten.pinnwandSpalte();
    }

    public MitarbeiterStammdaten getStammdaten() {
        return new MitarbeiterStammdaten(name, rolle, farbe, geburtstag, ferienanspruch,
                alsMechanikerWaehlbar, fuerAufgabenWaehlbar, pinnwandSpalte);
    }

    public String getName() {
        return name;
    }

    public Rolle getRolle() {
        return rolle;
    }

    public String getFarbe() {
        return farbe;
    }

    public LocalDate getGeburtstag() {
        return geburtstag;
    }

    public int getFerienanspruch() {
        return ferienanspruch;
    }

    public boolean isAlsMechanikerWaehlbar() {
        return alsMechanikerWaehlbar;
    }

    public boolean isFuerAufgabenWaehlbar() {
        return fuerAufgabenWaehlbar;
    }

    public boolean isPinnwandSpalte() {
        return pinnwandSpalte;
    }

    public boolean isAktiv() {
        return aktiv;
    }

    public int getReihenfolge() {
        return reihenfolge;
    }
}
