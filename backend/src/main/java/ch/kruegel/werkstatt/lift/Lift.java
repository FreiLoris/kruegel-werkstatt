package ch.kruegel.werkstatt.lift;

import ch.kruegel.werkstatt.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Eine Hebebühne. Termine werden einem Lift zugeteilt; in Tagesansicht und Dashboard
 * hat jeder aktive Lift eine eigene Spalte.
 *
 * <p>Stillgelegte Lifts werden {@linkplain #deaktivieren() deaktiviert}, nicht gelöscht –
 * alte Aufträge verweisen weiterhin auf sie.
 */
@Entity
public class Lift extends BaseEntity {

    static final int NAME_MAX = 30;

    @Column(nullable = false)
    private String name;

    private boolean aktiv;

    private int reihenfolge;

    protected Lift() {
        // für JPA
    }

    public Lift(String name, int reihenfolge) {
        umbenennen(name);
        this.aktiv = true;
        this.reihenfolge = reihenfolge;
    }

    /** Leerzeichen am Rand werden entfernt; 1–30 Zeichen. */
    public void umbenennen(String neuerName) {
        String bereinigt = neuerName == null ? "" : neuerName.strip();
        if (bereinigt.isEmpty() || bereinigt.length() > NAME_MAX) {
            throw new IllegalArgumentException("Name muss 1–" + NAME_MAX + " Zeichen lang sein: '" + bereinigt + "'");
        }
        this.name = bereinigt;
    }

    public void deaktivieren() {
        this.aktiv = false;
    }

    public void aktivieren() {
        this.aktiv = true;
    }

    public void verschieben(int neueReihenfolge) {
        this.reihenfolge = neueReihenfolge;
    }

    public String getName() {
        return name;
    }

    public boolean isAktiv() {
        return aktiv;
    }

    public int getReihenfolge() {
        return reihenfolge;
    }
}
