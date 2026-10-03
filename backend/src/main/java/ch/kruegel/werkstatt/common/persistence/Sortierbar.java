package ch.kruegel.werkstatt.common.persistence;

import java.util.UUID;

/** Entität mit fester, von Hand gesetzter Reihenfolge (Mitarbeiter, Lifts, Serviceleistungen, …). */
public interface Sortierbar {

    UUID getId();

    void verschieben(int neueReihenfolge);
}
