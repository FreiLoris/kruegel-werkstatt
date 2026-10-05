package ch.kruegel.workshop;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Empties all business tables – for tests that test from the outside (through the API)
 * and are therefore not rolled back automatically.
 *
 * <p>All tables in ONE statement: they refer to {@code employee} via {@code created_by}/{@code updated_by}.
 * Emptied one by one, foreign key errors could occur depending on the order.
 *
 * <p><b>New table → add it here.</b>
 */
public final class TestDatabase {

    private static final String BUSINESS_TABLES = "todo, courtesy_car_booking, task_service_item, task, import_run, vehicle, customer, courtesy_car, service_item, lift, employee";

    private TestDatabase() {
    }

    public static void clear(JdbcTemplate jdbc) {
        // company_profile refers to employee (changed by) → emptied too and its only row created again
        jdbc.execute("TRUNCATE company_profile, " + BUSINESS_TABLES);
        jdbc.execute("""
                INSERT INTO company_profile (id, version, created_at, updated_at, name)
                VALUES (uuidv7(), 0, now(), now(), 'Krügel Fahrzeugtechnik')""");
    }
}
