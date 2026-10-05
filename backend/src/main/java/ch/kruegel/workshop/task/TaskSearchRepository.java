package ch.kruegel.workshop.task;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Appointment search over ALL tasks (F11: the old search only looked at the week on screen).
 * Every word must occur in customer, vehicle, task number, work or notes – like the customer search.
 *
 * <p>Order: upcoming appointments first (nearest first), then past ones (newest first) – what you
 * look for is usually the next appointment of a customer.
 */
@Repository
class TaskSearchRepository {

    private final JdbcClient jdbc;

    TaskSearchRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    List<UUID> search(List<String> words, LocalDate today, int limit) {
        return jdbc.sql("""
                        SELECT t.id
                        FROM task t
                        JOIN customer c ON c.id = t.customer_id
                        LEFT JOIN vehicle v ON v.id = t.vehicle_id
                        WHERE NOT EXISTS (
                            SELECT 1 FROM unnest(cast(:words AS text[])) AS w(word)
                            WHERE strpos(lower(concat_ws(' ',
                                      c.last_name, c.first_name, c.company, c.city,
                                      v.license_plate, replace(v.license_plate, ' ', ''), v.make, v.model,
                                      t.task_number, t.work_description, t.notes, t.parts_description)), w.word) = 0)
                        ORDER BY t.appointment_date < :today,
                                 CASE WHEN t.appointment_date >= :today THEN t.appointment_date END ASC,
                                 t.appointment_date DESC,
                                 t.appointment_time
                        LIMIT :limit""")
                .param("words", words.toArray(String[]::new))
                .param("today", today)
                .param("limit", limit)
                .query(UUID.class)
                .list();
    }
}
