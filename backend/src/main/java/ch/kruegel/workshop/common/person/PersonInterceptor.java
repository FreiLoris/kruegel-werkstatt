package ch.kruegel.workshop.common.person;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.UUID;

/**
 * Runs before every API call (registered in {@code WebConfig}):
 * <ol>
 *   <li>Reads the person from the header {@value CurrentPerson#HEADER} and remembers it
 *       if it exists and is active.</li>
 *   <li>Changing requests (anything but GET) without a valid person are rejected (403).</li>
 * </ol>
 *
 * <p>Exception for initial setup: as long as there are no active employees nobody can be
 * selected – then creating without a person is allowed.
 *
 * <p>An interceptor (instead of a servlet filter) runs inside Spring MVC: the exception
 * therefore reaches the {@code GlobalExceptionHandler} and comes back in the usual error format.
 */
@Component
public class PersonInterceptor implements HandlerInterceptor {

    private static final Set<String> READ_ONLY = Set.of("GET", "HEAD", "OPTIONS");

    private final PersonDirectory directory;

    PersonInterceptor(PersonDirectory directory) {
        this.directory = directory;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        UUID person = validPerson(request.getHeader(CurrentPerson.HEADER));
        if (person != null) {
            CurrentPerson.set(request, person);
        }
        boolean changes = !READ_ONLY.contains(request.getMethod());
        if (changes && person == null && directory.anyActive()) {
            throw new NoPersonSelectedException();
        }
        return true;
    }

    private UUID validPerson(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            UUID id = UUID.fromString(header.trim());
            return directory.isActive(id) ? id : null;
        } catch (IllegalArgumentException notAUuid) {
            return null;
        }
    }
}
