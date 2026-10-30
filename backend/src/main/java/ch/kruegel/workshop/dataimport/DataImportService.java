package ch.kruegel.workshop.dataimport;

import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.dataimport.ImportTable.ImportRow;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Takes over customers and vehicles from the file of another program (neutral 5) – for a workshop that
 * does not come from SwissGarage. A move, not a sync like the SwissGarage import:
 * <ul>
 *   <li>The user says which column is which field – names and order differ from program to program.</li>
 *   <li>One row = one customer, with a vehicle if it has vehicle values. Rows with the same name and address
 *       are one customer with several vehicles.</li>
 *   <li>Taken over as customers of the app ({@code LOCAL}): editable, never deactivated or overwritten.</li>
 *   <li>Repeatable: a customer with the same name and address, a vehicle with the same chassis number or
 *       plate is already there – left as it is, not created twice.</li>
 *   <li>A customer deactivated in the app stays so – its rows are not taken over.</li>
 *   <li>A row without a name is skipped; a value that cannot be read (date, number) stays empty – both are
 *       reported, the rest is taken over.</li>
 *   <li>A dry run counts the same without storing; the real run stores all or nothing.</li>
 * </ul>
 */
@Service
public class DataImportService {

    static final int SAMPLES = 5;
    static final int MAX_PROBLEMS = 100;
    private static final int SAMPLE_MAX = 60;
    /** Key of the Postgres lock that lets only one import run at a time ("DATAIMP") */
    private static final long LOCK = 0x44415441494D50L;

    private static final Logger log = LoggerFactory.getLogger(DataImportService.class);

    private final CustomerRepository customers;
    private final VehicleRepository vehicles;
    private final ApplicationEventPublisher events;
    private final JdbcTemplate jdbc;

    DataImportService(CustomerRepository customers, VehicleRepository vehicles, ApplicationEventPublisher events,
                      JdbcTemplate jdbc) {
        this.customers = customers;
        this.vehicles = vehicles;
        this.events = events;
        this.jdbc = jdbc;
    }

    /** The columns with their first values and a suggested field – nothing is stored. */
    public DataImportPreviewDto preview(byte[] file, String charset, boolean firstRowIsData) {
        ImportTable table = read(file, charset, firstRowIsData);
        Set<ImportField> suggested = EnumSet.noneOf(ImportField.class);
        List<DataImportColumnDto> columns = new ArrayList<>();
        for (int c = 0; c < table.columnCount(); c++) {
            int column = c;
            // a field once – except text that is joined ("Strasse" + "Hausnummer"); without a header nothing to suggest
            ImportField field = firstRowIsData ? null : ImportField.suggest(table.headers().get(c))
                    .filter(f -> f == ImportField.STREET || !suggested.contains(f))
                    .orElse(null);
            if (field != null) {
                suggested.add(field);
            }
            List<String> samples = table.firstRows(SAMPLES).stream().map(row -> shorten(row.cell(column))).toList();
            columns.add(new DataImportColumnDto(c, table.headers().get(c), samples, field));
        }
        return new DataImportPreviewDto(columns, table.rows().size(), table.charset());
    }

    @Transactional
    public DataImportResultDto importFile(byte[] file, DataImportRequest request) {
        ImportTable table = read(file, request.charset(), request.firstRowIsData());
        Map<ImportField, List<Integer>> mapping = mapping(request, table.columnCount());
        if (!request.dryRun()) {
            // two imports at once (double click, two tablets) would both find nothing and both create –
            // the second waits for the first and then finds its customers
            jdbc.execute("SELECT pg_advisory_xact_lock(" + LOCK + ")");
        }
        Run run = new Run(mapping, request.dryRun());
        run.loadWhatTheAppHas();
        return run.execute(table);
    }

    /** One import: the rows one by one, against what the app already has */
    private final class Run {

        private final Map<ImportField, List<Integer>> mapping;
        private final boolean dryRun;
        private final List<String> problems = new ArrayList<>();
        /** All customers of the app, also deactivated ones – one deactivated on purpose must not come back */
        private final Map<String, Customer> knownCustomers = new HashMap<>();
        private final Set<String> knownVehicles = new HashSet<>();
        /** Make and model of the vehicles of a customer of the app – for vehicles without chassis number and plate */
        private final Map<UUID, Set<String>> knownDescriptions = new HashMap<>();
        /** The customers of this file by key – new or already there */
        private final Map<String, Customer> fileCustomers = new HashMap<>();
        private final Set<String> fileVehicles = new HashSet<>();
        private final List<Customer> newCustomers = new ArrayList<>();
        private final List<Vehicle> newVehicles = new ArrayList<>();
        private int rowsRead, skipped, customersExisting, vehiclesExisting, vehiclesSkipped;

        Run(Map<ImportField, List<Integer>> mapping, boolean dryRun) {
            this.mapping = mapping;
            this.dryRun = dryRun;
        }

        void loadWhatTheAppHas() {
            customers.findAll().forEach(c -> knownCustomers.putIfAbsent(customerKey(c.getDetails()), c));
            for (Vehicle vehicle : vehicles.findAll()) {
                VehicleDetails details = vehicle.getDetails();
                if (details.vin() != null) {
                    knownVehicles.add(vinKey(details.vin()));
                }
                // the plate moves on with the holder – only an active vehicle still has it
                if (details.licensePlate() != null && vehicle.isActive()) {
                    knownVehicles.add(plateKey(details.licensePlate()));
                }
            }
        }

        DataImportResultDto execute(ImportTable table) {
            table.rows().forEach(this::row);
            if (!dryRun) {
                customers.saveAll(newCustomers);
                vehicles.saveAll(newVehicles);
                if (!newCustomers.isEmpty()) {
                    events.publishEvent(new DataChanged("customers"));
                }
                if (!newVehicles.isEmpty()) {
                    events.publishEvent(new DataChanged("vehicles"));
                }
            }
            List<String> shown = problems.size() <= MAX_PROBLEMS ? problems : Stream.concat(
                    problems.stream().limit(MAX_PROBLEMS), Stream.of("… und " + (problems.size() - MAX_PROBLEMS) + " weitere")).toList();
            return new DataImportResultDto(dryRun, rowsRead, newCustomers.size(), customersExisting, newVehicles.size(),
                    vehiclesExisting, vehiclesSkipped, skipped, shown);
        }

        private void row(ImportRow row) {
            rowsRead++;
            if (value(row, ImportField.LAST_NAME).isEmpty() && value(row, ImportField.COMPANY).isEmpty()) {
                skipped++;
                problem(row, "kein Name – nicht übernommen");
                return;
            }
            CustomerDetails details;
            try {
                details = customerDetails(row);
            } catch (IllegalArgumentException e) {
                // with a name only a text that is too long is left
                skipped++;
                problem(row, "Text zu lang – nicht übernommen");
                return;
            }
            String key = customerKey(details);
            Customer customer = fileCustomers.get(key);
            if (customer == null) {
                customer = knownCustomers.get(key);
                if (customer != null) {
                    customersExisting++;
                } else {
                    customer = Customer.local(details);
                    newCustomers.add(customer);
                }
                fileCustomers.put(key, customer);
            }
            if (!customer.isActive()) {
                skipped++;
                problem(row, "Kunde ist in der App deaktiviert – nicht übernommen");
                return;
            }
            if (ImportField.VEHICLE.stream().anyMatch(field -> !value(row, field).isEmpty())) {
                vehicle(row, customer, key);
            }
        }

        private CustomerDetails customerDetails(ImportRow row) {
            String postalCode = value(row, ImportField.POSTAL_CODE);
            String city = value(row, ImportField.CITY);
            String both = value(row, ImportField.POSTAL_CODE_CITY);
            if (!both.isEmpty()) {
                String[] split = ImportValues.splitPostalCodeCity(both);
                postalCode = postalCode.isEmpty() ? split[0] : postalCode;
                city = city.isEmpty() ? split[1] : city;
            }
            return new CustomerDetails(value(row, ImportField.SALUTATION), value(row, ImportField.FIRST_NAME),
                    value(row, ImportField.LAST_NAME), value(row, ImportField.COMPANY), value(row, ImportField.ADDITION),
                    value(row, ImportField.STREET), postalCode, city, value(row, ImportField.PHONE),
                    value(row, ImportField.MOBILE), value(row, ImportField.EMAIL));
        }

        private void vehicle(ImportRow row, Customer customer, String customerKey) {
            if (value(row, ImportField.MAKE).isEmpty() && value(row, ImportField.MODEL).isEmpty()) {
                vehiclesSkipped++;
                problem(row, "Fahrzeug nicht übernommen – Marke und Modell fehlen");
                return;
            }
            VehicleDetails details;
            try {
                details = new VehicleDetails(value(row, ImportField.LICENSE_PLATE), value(row, ImportField.MAKE),
                        value(row, ImportField.MODEL), value(row, ImportField.VIN),
                        date(row, ImportField.FIRST_REGISTRATION), number(row, ImportField.MODEL_YEAR),
                        number(row, ImportField.MILEAGE), date(row, ImportField.LAST_MFK),
                        value(row, ImportField.COLOR), value(row, ImportField.FUEL));
            } catch (IllegalArgumentException e) {
                // make or model there, numbers checked – only a text that is too long is left
                vehiclesSkipped++;
                problem(row, "Fahrzeug nicht übernommen – Text zu lang");
                return;
            }
            // the same vehicle if ANY of its keys matches: in the app often only the plate, in the file also the chassis number
            List<String> keys = new ArrayList<>();
            if (details.vin() != null) {
                keys.add(vinKey(details.vin()));
            }
            if (details.licensePlate() != null) {
                keys.add(plateKey(details.licensePlate()));
            }
            boolean known;
            if (keys.isEmpty()) {
                String description = description(details);
                keys.add("car:" + customerKey + "|" + description);
                known = customer.getId() != null && knownDescriptions(customer.getId()).contains(description);
            } else {
                known = keys.stream().anyMatch(knownVehicles::contains);
            }
            if (keys.stream().anyMatch(fileVehicles::contains)) {
                vehiclesSkipped++;
                problem(row, "Fahrzeug steht mehrfach in der Datei – nur einmal übernommen");
            } else if (known) {
                vehiclesExisting++;
            } else {
                newVehicles.add(Vehicle.local(customer, details));
            }
            fileVehicles.addAll(keys);
        }

        /** Without chassis number and plate: make and model of the active vehicles of a customer of the app – once per customer */
        private Set<String> knownDescriptions(UUID customerId) {
            return knownDescriptions.computeIfAbsent(customerId, id -> vehicles.findByCustomerIdOrderByActiveDescLicensePlateAsc(id)
                    .stream()
                    .filter(Vehicle::isActive)
                    .map(v -> description(v.getDetails()))
                    .collect(Collectors.toSet()));
        }

        /** The text of the field's columns, joined with a space; "" if not mapped */
        private String value(ImportRow row, ImportField field) {
            return mapping.getOrDefault(field, List.of()).stream()
                    .map(row::cell)
                    .filter(value -> !value.isEmpty())
                    .collect(Collectors.joining(" "));
        }

        private LocalDate date(ImportRow row, ImportField field) {
            try {
                return ImportValues.date(value(row, field));
            } catch (IllegalArgumentException e) {
                problem(row, "«" + field.label() + "» ist " + e.getMessage() + " – leer gelassen");
                return null;
            }
        }

        private Integer number(ImportRow row, ImportField field) {
            try {
                String value = value(row, field);
                Integer number = field == ImportField.MODEL_YEAR ? ImportValues.modelYear(value) : ImportValues.integer(value);
                if (number != null && number < 0) {
                    throw new IllegalArgumentException("negativ");
                }
                return number;
            } catch (IllegalArgumentException e) {
                problem(row, "«" + field.label() + "» ist " + e.getMessage() + " – leer gelassen");
                return null;
            }
        }

        private void problem(ImportRow row, String text) {
            problems.add("Zeile " + row.number() + ": " + text);
        }
    }

    /** Field → its columns; checks the mapping against the file */
    private static Map<ImportField, List<Integer>> mapping(DataImportRequest request, int columnCount) {
        Map<ImportField, List<Integer>> mapping = new EnumMap<>(ImportField.class);
        Set<Integer> used = new HashSet<>();
        for (DataImportRequest.Column column : request.columns()) {
            if (column.index() >= columnCount) {
                throw new InvalidInputException("columns", "Spalte " + (column.index() + 1) + " gibt es in der Datei nicht.");
            }
            if (!used.add(column.index())) {
                throw new InvalidInputException("columns", "Spalte " + (column.index() + 1) + " ist zweimal zugeordnet.");
            }
            List<Integer> columns = mapping.computeIfAbsent(column.field(), f -> new ArrayList<>());
            if (!columns.isEmpty() && !column.field().joinable()) {
                throw new InvalidInputException("columns", "«" + column.field().label() + "» ist mehreren Spalten zugeordnet.");
            }
            columns.add(column.index());
        }
        if (!mapping.containsKey(ImportField.LAST_NAME) && !mapping.containsKey(ImportField.COMPANY)) {
            throw new InvalidInputException("columns", "Ordne mindestens «Name» oder «Firma» einer Spalte zu.");
        }
        // in the order of the file: "Strasse" before "Hausnummer"
        mapping.values().forEach(columns -> columns.sort(null));
        return mapping;
    }

    private static ImportTable read(byte[] file, String charset, boolean firstRowIsData) {
        if (charset != null && !ImportTable.isKnownCharset(charset)) {
            throw new InvalidInputException("charset", "Unbekannter Zeichensatz – " + String.join(" oder ", ImportTable.CHARSETS) + ".");
        }
        if (file.length >= 4 && (file[0] & 0xFF) == 0xD0 && (file[1] & 0xFF) == 0xCF) {
            throw new InvalidInputException("file", "Alte Excel-Datei (.xls) – bitte in Excel als .xlsx oder CSV speichern.");
        }
        ImportTable table;
        try {
            table = ImportTable.read(file, charset, firstRowIsData);
        } catch (ImportTable.UnreadableFileException e) {
            throw new InvalidInputException("file", e.getMessage());
        } catch (IOException | RuntimeException e) {
            // no file content in the log – only what went wrong
            log.warn("Import file not readable: {}", e.toString().lines().findFirst().orElse(""));
            throw new InvalidInputException("file", "Die Datei konnte nicht gelesen werden. Bitte eine CSV- oder Excel-Datei (.xlsx) verwenden.");
        }
        if (table.rows().isEmpty()) {
            throw new InvalidInputException("file", "Die Datei enthält keine Daten.");
        }
        return table;
    }

    /** Same name and address = same customer, whatever the case and spaces */
    static String customerKey(CustomerDetails d) {
        return Stream.of(d.lastName(), d.firstName(), d.company(), d.street(), d.postalCode())
                .map(value -> value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip())
                .collect(Collectors.joining("|"));
    }

    private static String vinKey(String vin) {
        return "vin:" + vin.replaceAll("\\s", "").toUpperCase(Locale.ROOT);
    }

    /** "vw golf" – make and model, whatever the case */
    private static String description(VehicleDetails details) {
        return details.description().toLowerCase(Locale.ROOT);
    }

    private static String plateKey(String plate) {
        return "plate:" + plate;
    }

    private static String shorten(String value) {
        return value.length() <= SAMPLE_MAX ? value : value.substring(0, SAMPLE_MAX) + "…";
    }
}
