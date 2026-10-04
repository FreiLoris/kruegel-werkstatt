package ch.kruegel.workshop.common.web;

import ch.kruegel.workshop.common.person.NoPersonSelectedException;
import ch.kruegel.workshop.common.persistence.StaleVersionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Comparator;
import java.util.List;

/**
 * Translates exceptions into uniform error responses following RFC 9457 ("Problem Details").
 *
 * <p>Every error response of the API looks like this ({@code Content-Type: application/problem+json}):
 * <pre>
 * {
 *   "status": 400,
 *   "title": "Ungültige Eingabe",
 *   "detail": "Bitte die markierten Felder korrigieren.",
 *   "instance": "/api/employees",
 *   "errors": [ { "field": "name", "message": "darf nicht leer sein" } ]   ← only for 400
 * }
 * </pre>
 * Titles and messages are German because the user reads them.
 *
 * <p>{@code @ResponseStatus} on the methods: that way springdoc includes the error responses
 * in the API description (and the frontend gets the type {@code ProblemDetail} generated).
 *
 * <p>Spring's standard errors (e.g. broken JSON, wrong HTTP method) are already handled in
 * the same format by the base class {@link ResponseEntityExceptionHandler}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** One field error from validation. */
    public record FieldError(String field, String message) {
    }

    /** 400 – input violates validation rules (@NotBlank, @Size, ...). */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {

        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new FieldError(f.getField(), f.getDefaultMessage()))
                .sorted(Comparator.comparing(FieldError::field))
                .toList();

        return handleExceptionInternal(ex, invalidInput(errors), headers, status, request);
    }

    /** 400 – business rule only the service can check (e.g. name already taken). */
    @ExceptionHandler(InvalidInputException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetail invalidInput(InvalidInputException ex) {
        return invalidInput(List.of(new FieldError(ex.getField(), ex.getMessage())));
    }

    /** 403 – change from a device without a valid person (e.g. TV in view-only mode). */
    @ExceptionHandler(NoPersonSelectedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    ProblemDetail noPersonSelected(NoPersonSelectedException ex) {
        return problem(HttpStatus.FORBIDDEN, "Keine Person gewählt", ex.getMessage());
    }

    /** 404 – record does not exist. */
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetail notFound(NotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Nicht gefunden", ex.getMessage());
    }

    /** 409 – someone else changed the record in the meantime. */
    @ExceptionHandler({StaleVersionException.class, OptimisticLockingFailureException.class})
    @ResponseStatus(HttpStatus.CONFLICT)
    ProblemDetail conflict(RuntimeException ex) {
        log.info("Edit conflict: {}", ex.getMessage());
        return problem(HttpStatus.CONFLICT, "Inzwischen geändert",
                "Der Datensatz wurde in der Zwischenzeit von jemand anderem geändert. Bitte neu laden.");
    }

    /** 409 – not allowed by a business rule (e.g. decommission the last lift). The message goes to the user as is. */
    @ExceptionHandler(BusinessRuleException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ProblemDetail businessRule(BusinessRuleException ex) {
        return problem(HttpStatus.CONFLICT, "Nicht möglich", ex.getMessage());
    }

    /**
     * 409 – a database constraint kicked in (e.g. two devices create the same name almost
     * at the same time – the service check let both through, the database did not).
     * Last line of defence; normally the service checks first and returns a more precise message.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ProblemDetail dataConflict(DataIntegrityViolationException ex) {
        log.warn("Database constraint violated: {}", ex.getMostSpecificCause().getMessage());
        return problem(HttpStatus.CONFLICT, "Nicht gespeichert",
                "Die Änderung passt nicht zu den vorhandenen Daten. Bitte neu laden und erneut versuchen.");
    }

    /**
     * 500 – everything unexpected. The technical message is only logged, never sent to the
     * browser (it could contain internals such as SQL or class names).
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    ProblemDetail unexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Unerwarteter Fehler",
                "Ein unerwarteter Fehler ist aufgetreten.");
    }

    private static ProblemDetail invalidInput(List<FieldError> errors) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Ungültige Eingabe",
                "Bitte die markierten Felder korrigieren.");
        problem.setProperty("errors", errors);
        return problem;
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        return problem;
    }
}
