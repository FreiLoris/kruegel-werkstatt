package ch.kruegel.werkstatt.common.person;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.UUID;

/**
 * Läuft vor jedem API-Aufruf (registriert in {@code WebConfig}):
 * <ol>
 *   <li>Liest die Person aus dem Header {@value AktuellePerson#HEADER} und merkt sie sich,
 *       wenn sie existiert und aktiv ist.</li>
 *   <li>Ändernde Anfragen (alles ausser GET) ohne gültige Person werden abgelehnt (403).</li>
 * </ol>
 *
 * <p>Ausnahme Ersteinrichtung: Solange es keine aktiven Mitarbeiter gibt, kann auch niemand
 * ausgewählt werden – dann ist Anlegen ohne Person erlaubt.
 *
 * <p>Ein Interceptor (statt Servlet-Filter) läuft innerhalb von Spring MVC: Die Exception
 * landet so beim {@code GlobalExceptionHandler} und kommt im gewohnten Fehlerformat zurück.
 */
@Component
public class PersonInterceptor implements HandlerInterceptor {

    private static final Set<String> NUR_LESEN = Set.of("GET", "HEAD", "OPTIONS");

    private final PersonVerzeichnis verzeichnis;

    PersonInterceptor(PersonVerzeichnis verzeichnis) {
        this.verzeichnis = verzeichnis;
    }

    @Override
    public boolean preHandle(HttpServletRequest anfrage, HttpServletResponse antwort, Object handler) {
        UUID person = gueltigePerson(anfrage.getHeader(AktuellePerson.HEADER));
        if (person != null) {
            AktuellePerson.setzen(anfrage, person);
        }
        boolean aendert = !NUR_LESEN.contains(anfrage.getMethod());
        if (aendert && person == null && verzeichnis.gibtEsAktive()) {
            throw new KeinePersonException();
        }
        return true;
    }

    private UUID gueltigePerson(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            UUID id = UUID.fromString(header.trim());
            return verzeichnis.istAktiv(id) ? id : null;
        } catch (IllegalArgumentException keineUuid) {
            return null;
        }
    }
}
