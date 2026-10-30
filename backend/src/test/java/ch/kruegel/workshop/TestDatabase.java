package ch.kruegel.workshop;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Empties all business tables – for tests that test from the outside (through the API)
 * and are therefore not rolled back automatically.
 *
 * <p>All tables in ONE statement: they refer to {@code employee} via {@code created_by}/{@code updated_by}.
 * The rows a migration creates (company profile, standard inspection station, tread limits, season deadlines, screen lock,
 * reminders, public holidays, modules)
 * are created again.
 * Emptied one by one, foreign key errors could occur depending on the order.
 *
 * <p><b>New table → add it here.</b>
 */
public final class TestDatabase {

    private static final String BUSINESS_TABLES = "module_settings_off, module_settings, public_holiday_settings_rule, public_holiday_settings, task_reminder, reminder_settings, customer_call, shopping_entry, shopping_item, vacation_entitlement, stock_item_supplier, stock_item, supplier_contact, supplier_delivery, supplier, storage_location, task_number_counter, absence, todo, note_assignee, note, courtesy_car_booking, task_service_item, task, inspection_station, tire_season_ack, tire_season_settings, screen_lock_settings, tire_set_event, tire_set, tire_place, tire_location, tire_hotel_settings, label_format, insurance, import_run, vehicle, customer, courtesy_car, service_item, lift, employee";

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
        // the deadlines of the season change, as the migration creates them
        jdbc.execute("""
                INSERT INTO tire_season_settings (id, version, created_at, updated_at, summer_deadline, winter_deadline)
                VALUES (uuidv7(), 0, now(), now(), '06-01', '12-01')""");
        // the screen lock, as the migration creates it
        jdbc.execute("""
                INSERT INTO screen_lock_settings (id, version, created_at, updated_at, lock_minutes)
                VALUES (uuidv7(), 0, now(), now(), 5)""");
        // the reminders, as the migration creates them: off
        jdbc.execute("""
                INSERT INTO reminder_settings (id, version, created_at, updated_at, enabled, send_time)
                VALUES (uuidv7(), 0, now(), now(), false, '16:00')""");
        // the public holidays, as the migration creates them: the canton of Zurich's
        jdbc.execute("""
                WITH settings AS (
                    INSERT INTO public_holiday_settings (id, version, created_at, updated_at)
                    VALUES (uuidv7(), 0, now(), now()) RETURNING id)
                INSERT INTO public_holiday_settings_rule (settings_id, rule)
                SELECT settings.id, rule FROM settings, unnest(ARRAY['NEUJAHR', 'BERCHTOLDSTAG', 'KARFREITAG', 'OSTERSONNTAG',
                    'OSTERMONTAG', 'TAG_DER_ARBEIT', 'AUFFAHRT', 'PFINGSTSONNTAG', 'PFINGSTMONTAG', 'NATIONALFEIERTAG',
                    'WEIHNACHTEN', 'STEPHANSTAG']) AS rule""");
        // the modules, as the migration creates them: all on
        jdbc.execute("""
                INSERT INTO module_settings (id, version, created_at, updated_at)
                VALUES (uuidv7(), 0, now(), now())""");
    }
}
