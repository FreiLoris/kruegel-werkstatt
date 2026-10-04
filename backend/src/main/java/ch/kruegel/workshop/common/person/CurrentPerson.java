package ch.kruegel.workshop.common.person;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Who is using the device the request comes from?
 *
 * <p>There is no login (on purpose, internal network). Instead every device selects a person
 * once, and the frontend sends that person's ID with every request in the header {@value #HEADER}.
 * The {@link PersonInterceptor} checks it and stores it here – the auditing
 * ({@code createdBy}/{@code updatedBy}) reads it from here.
 *
 * <p>No protection against intent (anyone can set the header), but against mistakes:
 * the workshop TV changes nothing, and every change has a name.
 */
public final class CurrentPerson {

    public static final String HEADER = "X-Person";

    static final String ATTRIBUTE = CurrentPerson.class.getName();

    private CurrentPerson() {
    }

    /** The verified person of the current request – empty outside of requests (e.g. at startup). */
    public static Optional<UUID> id() {
        RequestAttributes request = RequestContextHolder.getRequestAttributes();
        if (request == null) {
            return Optional.empty();
        }
        return Optional.ofNullable((UUID) request.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST));
    }

    static void set(HttpServletRequest request, UUID person) {
        request.setAttribute(ATTRIBUTE, person);
    }
}
