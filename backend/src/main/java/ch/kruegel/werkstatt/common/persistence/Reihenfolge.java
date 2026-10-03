package ch.kruegel.werkstatt.common.persistence;

import ch.kruegel.werkstatt.common.web.EingabeFehlerException;
import ch.kruegel.werkstatt.common.web.NichtGefundenException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Setzt eine neue Reihenfolge – für jede {@link Sortierbar}e Entität gleich:
 * Die genannten IDs kommen in dieser Reihenfolge nach vorne, alle anderen folgen dahinter
 * in ihrer bisherigen Reihenfolge. Danach sind die Positionen lückenlos 0, 1, 2, …
 *
 * <p>So kann das Frontend auch nur die aktiven schicken – die inaktiven rutschen ans Ende.
 */
public final class Reihenfolge {

    private Reihenfolge() {
    }

    /**
     * @param bisher  alle Einträge in der bisherigen Reihenfolge
     * @param ids     gewünschte Reihenfolge (erste ID = ganz vorne)
     * @param was     für Fehlermeldungen, z. B. "Lift"
     * @throws EingabeFehlerException wenn eine ID doppelt vorkommt
     * @throws NichtGefundenException wenn eine ID unbekannt ist
     */
    public static <T extends Sortierbar> void neuSetzen(List<T> bisher, List<UUID> ids, String was) {
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new EingabeFehlerException("ids", "enthält denselben Eintrag mehrfach");
        }
        Map<UUID, T> rest = new LinkedHashMap<>();
        bisher.forEach(eintrag -> rest.put(eintrag.getId(), eintrag));

        List<T> neu = new ArrayList<>();
        for (UUID id : ids) {
            T eintrag = rest.remove(id);
            if (eintrag == null) {
                throw new NichtGefundenException(was, id);
            }
            neu.add(eintrag);
        }
        neu.addAll(rest.values());

        for (int i = 0; i < neu.size(); i++) {
            neu.get(i).verschieben(i);
        }
    }
}
