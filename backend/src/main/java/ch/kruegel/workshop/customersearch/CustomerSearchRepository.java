package ch.kruegel.workshop.customersearch;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Search queries on the views {@code customer_search} and {@code vehicle_search} (migration V10).
 *
 * <p>Plain SQL with {@link JdbcClient} instead of JPA: the views are not entities, and the rule
 * "every word must occur" is easiest to express in SQL. Only IDs come back – the entities are
 * then loaded through the normal repositories.
 *
 * <p>{@code strpos} instead of {@code LIKE}: characters such as % or _ in the input have no
 * special meaning.
 */
@Repository
class CustomerSearchRepository {

    /** All words occur in the search text = there is no word that does not occur */
    private static final String ALL_WORDS_MATCH = """
            NOT EXISTS (SELECT 1 FROM unnest(cast(:words AS text[])) AS w(word)
                        WHERE strpos(s.search_text, w.word) = 0)""";

    private final JdbcClient jdbc;

    CustomerSearchRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Active customers that match all words, sorted by name. */
    List<UUID> customers(List<String> words, int limit) {
        return jdbc.sql("""
                        SELECT c.id
                        FROM customer c JOIN customer_search s ON s.id = c.id
                        WHERE %s
                        ORDER BY coalesce(c.last_name, c.company), c.first_name, c.id
                        LIMIT :limit""".formatted(ALL_WORDS_MATCH))
                .param("words", words.toArray(String[]::new))
                .param("limit", limit)
                .query(UUID.class)
                .list();
    }

    /** Active vehicles WITHOUT holder that match all words – they cannot be found through a customer. */
    List<UUID> vehiclesWithoutHolder(List<String> words, int limit) {
        return jdbc.sql("""
                        SELECT v.id
                        FROM vehicle v JOIN vehicle_search s ON s.id = v.id
                        WHERE v.customer_id IS NULL AND %s
                        ORDER BY v.license_plate, v.id
                        LIMIT :limit""".formatted(ALL_WORDS_MATCH))
                .param("words", words.toArray(String[]::new))
                .param("limit", limit)
                .query(UUID.class)
                .list();
    }

    /** Which of these vehicles match all words? To show the matching vehicle of a customer first. */
    List<UUID> matchingVehicles(List<UUID> vehicleIds, List<String> words) {
        if (vehicleIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                        SELECT s.id FROM vehicle_search s
                        WHERE s.id = ANY(cast(:ids AS uuid[])) AND %s""".formatted(ALL_WORDS_MATCH))
                .param("ids", vehicleIds.toArray(UUID[]::new))
                .param("words", words.toArray(String[]::new))
                .query(UUID.class)
                .list();
    }
}
