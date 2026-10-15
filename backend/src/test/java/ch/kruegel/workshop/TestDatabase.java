package ch.kruegel.workshop;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Empties all business tables – for tests that test from the outside (through the API)
 * and are therefore not rolled back automatically.
 *
 * <p>All tables in ONE statement: they refer to {@code employee} via {@code created_by}/{@code updated_by}.
 * The rows a migration creates (company profile, standard inspection station, tread limits) are created again.
 * Emptied one by one, foreign key errors could occur depending on the order.
 *
 * <p><b>New table → add it here.</b>
 */
public final class TestDatabase {

    private static final String BUSINESS_TABLES = "stock_item_supplier, stock_item, supplier, storage_location, task_number_counter, absence, todo, note_assignee, note, courtesy_car_booking, task_service_item, task, inspection_station, tire_set_event, tire_set, tire_hotel_settings, insurance, import_run, vehicle, customer, courtesy_car, service_item, lift, employee";

    private TestDatabase() {
    }

    public static void clear(JdbcTemplate jdbc) {
        // company_profile refers to employee (changed by) → emptied too and its only row created again
        jdbc.execute("TRUNCATE company_profile, " + BUSINESS_TABLES);
        jdbc.execute("""
                INSERT INTO company_profile (id, version, created_at, updated_at, name)
                VALUES (uuidv7(), 0, now(), now(), 'Krügel Fahrzeugtechnik')""");
        // the standard inspection station, as the migration creates it
        jdbc.execute("""
                INSERT INTO inspection_station (id, version, created_at, updated_at, name, minutes, is_default, active)
                VALUES (uuidv7(), 0, now(), now(), 'Strassenverkehrsamt Winterthur-Wülflingen', 60, true, true)""");
        // the tread limits of the tyre hotel, as the migration creates them
        jdbc.execute("""
                INSERT INTO tire_hotel_settings (id, version, created_at, updated_at, summer_mm, winter_mm, minimum_mm)
                VALUES (uuidv7(), 0, now(), now(), 3.0, 4.0, 1.6)""");
    }
}
