package ch.kruegel.werkstatt.common.person;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Wer benutzt gerade das Gerät, von dem die Anfrage kommt?
 *
 * <p>Es gibt kein Login (bewusst, internes Netz). Stattdessen wählt jedes Gerät einmal eine
 * Person aus, und das Frontend schickt deren ID bei jeder Anfrage im Header {@value #HEADER} mit.
 * Der {@link PersonInterceptor} prüft sie und legt sie hier ab – von da liest sie das
 * Auditing ({@code erstelltVon}/{@code geaendertVon}).
 *
 * <p>Kein Schutz vor Absicht (den Header kann jeder setzen), aber vor Versehen:
 * Der Werkstatt-TV ändert nichts, und jede Änderung hat einen Namen.
 */
public final class AktuellePerson {

    public static final String HEADER = "X-Person";

    static final String ATTRIBUT = AktuellePerson.class.getName();

    private AktuellePerson() {
    }

    /** Die geprüfte Person der laufenden Anfrage – leer ausserhalb von Anfragen (z. B. beim Start). */
    public static Optional<UUID> id() {
        RequestAttributes anfrage = RequestContextHolder.getRequestAttributes();
        if (anfrage == null) {
            return Optional.empty();
        }
        return Optional.ofNullable((UUID) anfrage.getAttribute(ATTRIBUT, RequestAttributes.SCOPE_REQUEST));
    }

    static void setzen(HttpServletRequest anfrage, UUID person) {
        anfrage.setAttribute(ATTRIBUT, person);
    }
}
