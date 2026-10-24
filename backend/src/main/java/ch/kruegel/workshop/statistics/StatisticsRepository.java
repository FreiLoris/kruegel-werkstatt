package ch.kruegel.workshop.statistics;

import ch.kruegel.workshop.common.LicensePlates;
import ch.kruegel.workshop.statistics.VehicleStatisticsDto.VehicleFactDto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Every counting query of the statistics page – the SQL of a number is found here and nowhere else.
 * Plain SQL with {@link JdbcClient}: only numbers come back, no entities need to be loaded.
 *
 * <p>Free text (make, colour, city …) is grouped by {@code upper(trim(…))} so "VW" and "vw " count
 * together; the label is the spelling used most often ({@code mode()}). Rankings have the most first.
 */
@Repository
class StatisticsRepository {

    /** Ranking length – a long list says nothing */
    static final int TOP = 8;

    /** Same rule as the task: the displayed name of a customer (see {@code CustomerDetails.displayName}) */
    private static final String CUSTOMER_NAME = """
            coalesce(c.company || coalesce(' (' || c.last_name || coalesce(' ' || c.first_name, '') || ')', ''),
                     c.last_name || coalesce(' ' || c.first_name, ''))""";

    private static final String IN_HOTEL = "state = 'IN_HOTEL'";

    /**
     * The free text columns that are ranked – a fixed list, so {@link #topTexts} never puts anything
     * but these names into its SQL.
     */
    enum Text {
        MAKE("vehicle", "make", "active"),
        COLOR("vehicle", "color", "active"),
        FUEL("vehicle", "fuel", "active"),
        CITY("customer", "city", "active"),
        FIRST_NAME("customer", "first_name", "active"),
        TIRE_BRAND("tire_set", "brand", IN_HOTEL),
        TIRE_DIMENSION("tire_set", "dimension", IN_HOTEL);

        private final String table;
        private final String column;
        private final String where;

        Text(String table, String column, String where) {
            this.table = table;
            this.column = column;
            this.where = where;
        }
    }

    private final JdbcClient jdbc;

    StatisticsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The {@link #TOP} most frequent values of a free text column */
    List<CountDto> topTexts(Text text) {
        return counts("""
                SELECT mode() WITHIN GROUP (ORDER BY trim(%2$s)), count(*)
                FROM %1$s WHERE %3$s AND nullif(trim(%2$s), '') IS NOT NULL
                GROUP BY upper(trim(%2$s)) ORDER BY 2 DESC, 1 LIMIT %4$d""".formatted(text.table, text.column, text.where, TOP));
    }

    // ── Tasks ───────────────────────────────────────────────

    long tasks() {
        return count("SELECT count(*) FROM task");
    }

    /** Appointments on {@code from} up to the day before {@code to} – planned ones included */
    long tasksBetween(LocalDate from, LocalDate to) {
        return count("SELECT count(*) FROM task WHERE appointment_date >= :from AND appointment_date < :to", Map.of("from", from, "to", to));
    }

    long tasksDone() {
        return count("SELECT count(*) FROM task WHERE status = 'DONE'");
    }

    long tasksWaitingCustomer() {
        return count("SELECT count(*) FROM task WHERE waiting_customer");
    }

    long tasksWithTireChange() {
        return count("SELECT count(*) FROM task WHERE tire_change");
    }

    long tasksWithMfk() {
        return count("SELECT count(*) FROM task WHERE mfk");
    }

    LocalDate firstAppointment() {
        return jdbc.sql("SELECT min(appointment_date) FROM task").query(LocalDate.class).optional().orElse(null);
    }

    /** Count per month from {@code from} to {@code to} (first days), also months without a task */
    List<CountDto> tasksPerMonth(LocalDate from, LocalDate to) {
        return counts("""
                SELECT to_char(m, 'YYYY-MM'), count(t.id)
                FROM generate_series(cast(:from AS timestamp), cast(:to AS timestamp), interval '1 month') AS m
                LEFT JOIN task t ON date_trunc('month', cast(t.appointment_date AS timestamp)) = m
                GROUP BY m ORDER BY m""", Map.of("from", from, "to", to));
    }

    /** 7 numbers, Monday first */
    List<Long> tasksPerWeekday() {
        Map<Integer, Long> byDay = jdbc.sql("""
                        SELECT cast(extract(isodow FROM appointment_date) AS int), count(*)
                        FROM task WHERE appointment_date IS NOT NULL GROUP BY 1""")
                .query((rs, n) -> Map.entry(rs.getInt(1), rs.getLong(2)))
                .list().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        return IntStream.rangeClosed(1, 7).mapToObj(day -> byDay.getOrDefault(day, 0L)).toList();
    }

    /** The hours of the start times; "Zeit offen" has no real time */
    List<CountDto> tasksPerHour() {
        return counts("""
                SELECT to_char(appointment_time, 'HH24'), count(*) FROM task
                WHERE appointment_time IS NOT NULL AND NOT time_open GROUP BY 1 ORDER BY 1""");
    }

    List<CountDto> tasksByStatus() {
        return counts("SELECT status, count(*) FROM task GROUP BY status ORDER BY 2 DESC, 1");
    }

    List<CountDto> serviceItems() {
        return counts("""
                SELECT s.name, count(*) FROM task_service_item ts JOIN service_item s ON s.id = ts.service_item_id
                GROUP BY s.id, s.name ORDER BY 2 DESC, 1 LIMIT %d""".formatted(TOP));
    }

    /** Every active lift, also one without a task */
    List<CountDto> tasksPerLift() {
        return counts("""
                SELECT l.name, count(t.id) FROM lift l LEFT JOIN task t ON t.lift_id = l.id
                WHERE l.active GROUP BY l.id, l.name, l.sort_order ORDER BY 2 DESC, l.sort_order""");
    }

    List<CountDto> tasksPerMechanic() {
        return tasksPerEmployee("mechanic_id");
    }

    List<CountDto> tasksPerAcceptedBy() {
        return tasksPerEmployee("accepted_by");
    }

    private List<CountDto> tasksPerEmployee(String column) {
        return counts("""
                SELECT e.name, count(*) FROM task t JOIN employee e ON e.id = t.%s
                GROUP BY e.id, e.name ORDER BY 2 DESC, 1 LIMIT %d""".formatted(column, TOP));
    }

    /** Customers with more than one task */
    List<CountDto> regulars() {
        return counts("""
                SELECT %s, count(*) FROM task t JOIN customer c ON c.id = t.customer_id
                GROUP BY c.id HAVING count(*) > 1 ORDER BY 2 DESC, 1 LIMIT 5""".formatted(CUSTOMER_NAME));
    }

    /** The day with the most appointments (label = ISO date); the latest of equal days */
    CountDto busiestDay() {
        return first(counts("""
                SELECT to_char(appointment_date, 'YYYY-MM-DD'), count(*) FROM task WHERE appointment_date IS NOT NULL
                GROUP BY appointment_date ORDER BY 2 DESC, appointment_date DESC LIMIT 1"""));
    }

    /** Start to end on the lift in minutes; a task over two weeks is a typo, not a job */
    Double averageTaskMinutes() {
        return number("""
                SELECT avg(extract(epoch FROM appointment_end - (appointment_date + appointment_time)) / 60) FROM task
                WHERE appointment_time IS NOT NULL AND appointment_end IS NOT NULL AND NOT time_open
                  AND appointment_end - (appointment_date + appointment_time) < interval '14 days'""");
    }

    // ── Vehicles ────────────────────────────────────────────

    long vehicles() {
        return count("SELECT count(*) FROM vehicle WHERE active");
    }

    List<CountDto> models() {
        return counts("""
                SELECT mode() WITHIN GROUP (ORDER BY trim(make) || ' ' || trim(model)), count(*) FROM vehicle
                WHERE active AND nullif(trim(make), '') IS NOT NULL AND nullif(trim(model), '') IS NOT NULL
                GROUP BY upper(trim(make)), upper(trim(model)) ORDER BY 2 DESC, 1 LIMIT %d""".formatted(TOP));
    }

    /** Swiss plates only ({@link LicensePlates}: canton code, space, digits) – "GR ABC-123" is Greek */
    List<CountDto> cantons() {
        return counts("""
                SELECT substring(license_plate FROM '^[A-Z]{2}'), count(*) FROM vehicle
                WHERE active AND license_plate ~ '^[A-Z]{2} [0-9]{1,6}$'
                  AND substring(license_plate FROM '^[A-Z]{2}') = ANY(cast(:cantons AS text[]))
                GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT %d""".formatted(TOP),
                Map.of("cantons", LicensePlates.CANTONS.toArray(String[]::new)));
    }

    Double averageVehicleAgeYears(LocalDate today) {
        return number("""
                SELECT avg((cast(:today AS date) - first_registration) / 365.25) FROM vehicle
                WHERE active AND first_registration IS NOT NULL""", Map.of("today", today));
    }

    /** By first registration, or the model year if that is all there is */
    VehicleFactDto oldestVehicle() {
        return vehicleFact("""
                SELECT make, model, coalesce(cast(extract(year FROM first_registration) AS int), model_year), mileage_km
                FROM vehicle WHERE active AND (first_registration IS NOT NULL OR model_year IS NOT NULL)
                ORDER BY coalesce(first_registration, make_date(model_year, 1, 1)), id LIMIT 1""");
    }

    VehicleFactDto mostKmVehicle() {
        return vehicleFact("""
                SELECT make, model, coalesce(cast(extract(year FROM first_registration) AS int), model_year), mileage_km
                FROM vehicle WHERE active AND mileage_km IS NOT NULL
                ORDER BY mileage_km DESC, id LIMIT 1""");
    }

    long totalKm() {
        return count("SELECT coalesce(sum(mileage_km), 0) FROM vehicle WHERE active");
    }

    long vehiclesWithMileage() {
        return count("SELECT count(*) FROM vehicle WHERE active AND mileage_km IS NOT NULL");
    }

    private VehicleFactDto vehicleFact(String sql) {
        return jdbc.sql(sql)
                .query((rs, n) -> new VehicleFactDto(rs.getString(1), rs.getString(2),
                        rs.getObject(3, Integer.class), rs.getObject(4, Integer.class)))
                .optional().orElse(null);
    }

    // ── Customers ───────────────────────────────────────────

    long customers() {
        return count("SELECT count(*) FROM customer WHERE active");
    }

    long companies() {
        return count("SELECT count(*) FROM customer WHERE active AND company IS NOT NULL");
    }

    /** Entered on or after {@code from} – the day in Swiss time */
    long customersSince(LocalDate from) {
        return count("""
                SELECT count(*) FROM customer
                WHERE active AND cast(created_at AT TIME ZONE 'Europe/Zurich' AS date) >= :from""", Map.of("from", from));
    }

    long customersWithEmail() {
        return count("SELECT count(*) FROM customer WHERE active AND email IS NOT NULL");
    }

    long customersWithMobile() {
        return count("SELECT count(*) FROM customer WHERE active AND mobile IS NOT NULL");
    }

    List<CountDto> customerSources() {
        return counts("SELECT source, count(*) FROM customer WHERE active GROUP BY source ORDER BY 2 DESC, 1");
    }

    // ── Tyre hotel ──────────────────────────────────────────

    long tireSets() {
        return count("SELECT count(*) FROM tire_set");
    }

    List<CountDto> tireStates() {
        return counts("SELECT state, count(*) FROM tire_set GROUP BY state ORDER BY 2 DESC, 1");
    }

    List<CountDto> tireSeasonsInHotel() {
        return counts("SELECT season, count(*) FROM tire_set WHERE " + IN_HOTEL + " GROUP BY season ORDER BY 2 DESC, 1");
    }

    List<CountDto> tireKindsInHotel() {
        return counts("SELECT kind, count(*) FROM tire_set WHERE " + IN_HOTEL + " GROUP BY kind ORDER BY 2 DESC, 1");
    }

    /** Over the sets in the hotel with all four depths measured */
    Double averageDepthInHotel() {
        return number("""
                SELECT avg((depth_fl + depth_fr + depth_rl + depth_rr) / 4) FROM tire_set
                WHERE %s AND depth_fl IS NOT NULL AND depth_fr IS NOT NULL AND depth_rl IS NOT NULL AND depth_rr IS NOT NULL"""
                .formatted(IN_HOTEL));
    }

    Integer oldestTireYearInHotel() {
        return jdbc.sql("SELECT min(year) FROM tire_set WHERE " + IN_HOTEL).query(Integer.class).optional().orElse(null);
    }

    List<CountDto> tireEventsSince(LocalDate from) {
        return counts("SELECT kind, count(*) FROM tire_set_event WHERE happened_on >= :from GROUP BY kind ORDER BY 2 DESC, 1",
                Map.of("from", from));
    }

    // ── Team ────────────────────────────────────────────────

    long employees() {
        return count("SELECT count(*) FROM employee WHERE active");
    }

    /** Active people with a birthday: name and birthday */
    List<Map.Entry<String, LocalDate>> birthdays() {
        return jdbc.sql("SELECT name, birthday FROM employee WHERE active AND birthday IS NOT NULL ORDER BY sort_order, name")
                .query((rs, n) -> Map.entry(rs.getString(1), rs.getObject(2, LocalDate.class)))
                .list();
    }

    long todosOpen() {
        return count("SELECT count(*) FROM todo WHERE done_at IS NULL");
    }

    long todosDone() {
        return count("SELECT count(*) FROM todo WHERE done_at IS NOT NULL");
    }

    CountDto todoChampion() {
        return first(counts("""
                SELECT e.name, count(*) FROM todo t JOIN employee e ON e.id = t.done_by
                GROUP BY e.id, e.name ORDER BY 2 DESC, 1 LIMIT 1"""));
    }

    long notesOnPinboard() {
        return count("SELECT count(*) FROM note WHERE archived_at IS NULL");
    }

    // ── Material ────────────────────────────────────────────

    long shoppingItems() {
        return count("SELECT count(*) FROM shopping_item");
    }

    List<CountDto> shoppingStatus() {
        return counts("SELECT status, count(*) FROM shopping_item GROUP BY status ORDER BY 2 DESC, 1");
    }

    List<CountDto> suppliers() {
        return counts("""
                SELECT s.name, count(*) FROM shopping_item i JOIN supplier s ON s.id = i.supplier_id
                GROUP BY s.id, s.name ORDER BY 2 DESC, 1 LIMIT %d""".formatted(TOP));
    }

    Double averageDeliveryDays() {
        return number("""
                SELECT avg(arrived_on - ordered_on) FROM shopping_item
                WHERE ordered_on IS NOT NULL AND arrived_on >= ordered_on""");
    }

    long stockItems() {
        return count("SELECT count(*) FROM stock_item");
    }

    long stockQuantity() {
        return count("SELECT coalesce(sum(quantity), 0) FROM stock_item");
    }

    List<CountDto> stockCategories() {
        return counts("SELECT category, count(*) FROM stock_item GROUP BY category ORDER BY 2 DESC, 1");
    }

    long courtesyBookings() {
        return count("SELECT count(*) FROM courtesy_car_booking");
    }

    List<CountDto> courtesyCars() {
        return counts("""
                SELECT c.name, count(*) FROM courtesy_car_booking b JOIN courtesy_car c ON c.id = b.courtesy_car_id
                GROUP BY c.id, c.name ORDER BY 2 DESC, 1 LIMIT %d""".formatted(TOP));
    }

    /**
     * Days the cars were out, pick-up and return day counted: up to the real return – also when it
     * was late; a car not back yet up to its planned return, at most up to today. A booking that has
     * not started yet does not count.
     */
    long courtesyDays(LocalDate today) {
        return count("""
                SELECT coalesce(sum(least(cast(coalesce(returned_at, return_at) AS date), cast(:today AS date))
                                    - cast(pickup_at AS date) + 1), 0)
                FROM courtesy_car_booking WHERE cast(pickup_at AS date) <= :today""", Map.of("today", today));
    }

    // ── Helpers ─────────────────────────────────────────────

    private long count(String sql) {
        return count(sql, Map.of());
    }

    private long count(String sql, Map<String, ?> params) {
        Long value = jdbc.sql(sql).params(params).query(Long.class).single();
        return value == null ? 0 : value;
    }

    private Double number(String sql) {
        return number(sql, Map.of());
    }

    private Double number(String sql, Map<String, ?> params) {
        return jdbc.sql(sql).params(params).query(Double.class).optional().orElse(null);
    }

    private List<CountDto> counts(String sql) {
        return counts(sql, Map.of());
    }

    private List<CountDto> counts(String sql, Map<String, ?> params) {
        return jdbc.sql(sql).params(params).query(StatisticsRepository::countRow).list();
    }

    private static CountDto first(List<CountDto> rows) {
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private static CountDto countRow(ResultSet rs, int row) throws SQLException {
        return new CountDto(rs.getString(1), rs.getLong(2));
    }
}
