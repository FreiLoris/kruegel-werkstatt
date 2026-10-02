package ch.kruegel.werkstatt.common.web;

import ch.kruegel.werkstatt.common.persistence.VeralteteVersionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Comparator;
import java.util.List;

/**
 * Übersetzt Exceptions in einheitliche Fehlerantworten nach RFC 9457 ("Problem Details").
 *
 * <p>Jede Fehlerantwort der API sieht so aus ({@code Content-Type: application/problem+json}):
 * <pre>
 * {
 *   "status": 400,
 *   "title": "Ungültige Eingabe",
 *   "detail": "Bitte die markierten Felder korrigieren.",
 *   "instance": "/api/mitarbeiter",
 *   "fehler": [ { "feld": "name", "meldung": "darf nicht leer sein" } ]   ← nur bei 400
 * }
 * </pre>
 *
 * <p>Standardfehler von Spring (z.B. kaputtes JSON, falsche HTTP-Methode) behandelt die
 * Basisklasse {@link ResponseEntityExceptionHandler} bereits im selben Format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Ein Feldfehler aus der Validierung. */
    public record Feldfehler(String feld, String meldung) {
    }

    /** 400 – Eingaben verletzen Validierungsregeln (@NotBlank, @Size, ...). */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        List<Feldfehler> fehler = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new Feldfehler(f.getField(), f.getDefaultMessage()))
                .sorted(Comparator.comparing(Feldfehler::feld))
                .toList();

        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Ungültige Eingabe",
                "Bitte die markierten Felder korrigieren.");
        problem.setProperty("fehler", fehler);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    /** 404 – Datensatz existiert nicht. */
    @ExceptionHandler(NichtGefundenException.class)
    ProblemDetail nichtGefunden(NichtGefundenException ex) {
        return problem(HttpStatus.NOT_FOUND, "Nicht gefunden", ex.getMessage());
    }

    /** 409 – jemand anderes hat den Datensatz inzwischen geändert. */
    @ExceptionHandler({VeralteteVersionException.class, OptimisticLockingFailureException.class})
    ProblemDetail konflikt(RuntimeException ex) {
        log.info("Bearbeitungskonflikt: {}", ex.getMessage());
        return problem(HttpStatus.CONFLICT, "Inzwischen geändert",
                "Der Datensatz wurde in der Zwischenzeit von jemand anderem geändert. Bitte neu laden.");
    }

    /**
     * 500 – alles Unerwartete. Die technische Meldung wird nur geloggt, nicht an den
     * Browser geschickt (könnte Interna wie SQL oder Klassennamen enthalten).
     */
    @ExceptionHandler(Exception.class)
    ProblemDetail unerwartet(Exception ex) {
        log.error("Unerwarteter Fehler", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Unerwarteter Fehler",
                "Ein unerwarteter Fehler ist aufgetreten.");
    }

    private static ProblemDetail problem(HttpStatus status, String titel, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(titel);
        return problem;
    }
}
