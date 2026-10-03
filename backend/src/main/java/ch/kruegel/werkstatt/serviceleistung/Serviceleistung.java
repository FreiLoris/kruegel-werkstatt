package ch.kruegel.werkstatt.serviceleistung;

import ch.kruegel.werkstatt.common.persistence.BaseEntity;
import ch.kruegel.werkstatt.common.persistence.Sortierbar;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Eine Leistung, die beim Service angekreuzt werden kann (z. B. Ölwechsel).
 *
 * <p>Nicht mehr angebotene Leistungen werden {@linkplain #deaktivieren() deaktiviert},
 * nicht gelöscht – alte Aufträge verweisen weiterhin auf sie.
 */
@Entity
public class Serviceleistung extends BaseEntity implements Sortierbar {

    static final int NAME_MAX = 40;

    @Column(nullable = false)
    private String name;

    private boolean aktiv;

    private int reihenfolge;

    protected Serviceleistung() {
        // für JPA
    }

    public Serviceleistung(String name, int reihenfolge) {
        umbenennen(name);
        this.aktiv = true;
        this.reihenfolge = reihenfolge;
    }

    /** Leerzeichen am Rand werden entfernt; 1–40 Zeichen. */
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

    @Override
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
