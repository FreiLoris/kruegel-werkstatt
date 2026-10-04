package ch.kruegel.workshop.common.live;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * "Something changed in this topic" – sent to every open browser so it reloads
 * the affected data.
 *
 * <p>Usage in a service, after saving:
 * <pre>
 *   events.publishEvent(new DataChanged("employees"));
 * </pre>
 *
 * <p>{@code topic} equals the first part of the query key in the frontend
 * (e.g. {@code ['employees', ...]}). It is only sent once the transaction has committed
 * successfully – see {@link LiveUpdateService}.
 *
 * @param topic business area in lower case, same as the API path, e.g. "employees", "service-items"
 */
public record DataChanged(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "employees") String topic) {
}
