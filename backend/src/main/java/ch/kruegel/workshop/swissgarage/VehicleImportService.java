package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.swissgarage.ExcelSheet.ExcelRow;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleDetails;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * Imports the SwissGarage vehicle list ("Fahrzeug.xlsx", export: Fahrzeuge → Export → Excel).
 *
 * <p>Rules (ADR 0003, old app):
 * <ul>
 *   <li>Only rows with make or model ("Marke"/"Typ") – like the old app.</li>
 *   <li>Matched by SwissGarage internal number ("Int.Nr."); missing SwissGarage vehicles are
 *       deactivated, local vehicles are never touched.</li>
 *   <li>Holder by "Adressnummer" → the SwissGarage customer from the address list import. A holder
 *       the address list skipped (address kind empty, blocked, supplier) is created from the address
 *       on the vehicle itself – in SwissGarage a vehicle is always entered for a chosen customer, so
 *       its address is that customer's (FB-27). A deactivated holder is activated again. Without
 *       address number or name the vehicle stays without holder, each one listed with its reason.</li>
 *   <li>Invalid single values (e.g. an impossible date) do not stop the row: the field stays empty
 *       and the problem is logged.</li>
 * </ul>
 */
@Service
public class VehicleImportService {

    private static final String NUMBER = "Int.Nr.";
    private static final String HOLDER = "Adressnummer";

    private final VehicleRepository vehicles;
    private final CustomerRepository customers;
    private final ImportRunRepository runs;
    private final ApplicationEventPublisher events;

    VehicleImportService(VehicleRepository vehicles, CustomerRepository customers, ImportRunRepository runs,
                         ApplicationEventPublisher events) {
        this.vehicles = vehicles;
        this.customers = customers;
        this.runs = runs;
        this.events = events;
    }

    @Transactional
    public ImportRunDto importVehicleList(InputStream file, String fileName) {
        ExcelSheet sheet = read(file);
        if (!sheet.hasColumn(NUMBER) || !sheet.hasColumn("Marke")) {
            throw new InvalidInputException("file",
                    "Das ist keine SwissGarage-Fahrzeugliste: Spalte «" + NUMBER + "» oder «Marke» fehlt.");
        }
        // without it every vehicle would silently lose its holder
        if (!sheet.hasColumn(HOLDER)) {
            throw new InvalidInputException("file", "Spalte «" + HOLDER + "» fehlt – ohne sie verlören alle Fahrzeuge ihren Halter.");
        }

        Holders holders = new Holders(customers.findBySource(RecordSource.SWISSGARAGE));
        Map<String, Vehicle> known = new HashMap<>();
        vehicles.findBySource(RecordSource.SWISSGARAGE).forEach(v -> known.put(v.getSwissgarageNumber(), v));
        long knownActive = known.values().stream().filter(Vehicle::isActive).count();

        int rowsRead = 0, skipped = 0, created = 0, updated = 0, unchanged = 0;
        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<Vehicle> toSave = new ArrayList<>();

        for (ExcelRow row : sheet.rows()) {
            if (row.isEmpty()) {
                continue;
            }
            rowsRead++;
            if (row.get("Marke").isEmpty() && row.get("Typ").isEmpty()) {
                skipped++; // like the old app: rows without make and model are no vehicles
                continue;
            }
            String number = row.get(NUMBER);
            if (number.isEmpty()) {
                skipped++;
                problems.add("Zeile " + row.number() + ": keine Int.Nr.");
                continue;
            }
            if (!seen.add(number)) {
                skipped++;
                problems.add("Zeile " + row.number() + ": Int.Nr. " + number + " kommt mehrfach vor");
                continue;
            }

            String where = "Zeile " + row.number() + " (Int.Nr. " + number + "): ";
            VehicleDetails details;
            try {
                details = details(row, message -> problems.add(where + message));
            } catch (IllegalArgumentException e) {
                // e.g. license plate longer than 20 characters – the vehicle cannot be stored
                skipped++;
                problems.add(where + "ungültige Angaben (z. B. Kennzeichen zu lang) – nicht importiert");
                continue;
            }
            Customer holder = holders.of(row, where);

            Vehicle existing = known.get(number);
            if (existing == null) {
                toSave.add(Vehicle.fromSwissGarage(number, holder, details));
                created++;
            } else if (existing.isActive() && existing.getDetails().equals(details) && sameHolder(existing, holder)) {
                unchanged++;
            } else {
                existing.updateFromSwissGarage(holder, details);
                updated++;
            }
        }

        if (seen.isEmpty()) {
            throw new InvalidInputException("file", "Die Datei enthält keine Fahrzeuge – nichts importiert.");
        }
        // the holders first – what the import did about them, then the problems of single rows
        List<String> messages = holders.messages();
        messages.addAll(problems);

        List<Vehicle> missing = known.values().stream()
                .filter(v -> v.isActive() && !seen.contains(v.getSwissgarageNumber()))
                .toList();
        ImportGuard.checkDeactivations(knownActive, missing.size(), "Fahrzeugen");
        missing.forEach(Vehicle::deactivate);

        vehicles.saveAll(toSave);
        vehicles.flush();
        ImportRun run = runs.save(new ImportRun(ImportRun.Kind.VEHICLES, fileName,
                new ImportCounts(rowsRead, skipped, created, updated, unchanged, missing.size(), messages)));
        runs.flush();
        events.publishEvent(new DataChanged("vehicles"));
        if (holders.changed()) {
            events.publishEvent(new DataChanged("customers"));
        }
        events.publishEvent(new DataChanged(SwissGarageImportController.TOPIC));
        return ImportRunDto.of(run);
    }

    /**
     * Row → details. Invalid single values become empty and are reported via {@code problem},
     * so one bad cell does not lose the whole vehicle.
     */
    private static VehicleDetails details(ExcelRow row, Consumer<String> problem) {
        LocalDate firstRegistration = convert(row.get("1.Inv"), ExcelValues::date, "1. Inverkehrsetzung", problem);
        LocalDate lastMfk = convert(row.get("MFK"), ExcelValues::date, "MFK", problem);
        Integer mileage = convert(row.get("Km aktuell"), ExcelValues::integer, "Km-Stand", problem);
        Integer year = convert(row.get("Jahrg."), ExcelValues::integer, "Jahrgang", problem);
        if (year != null && (year < 1900 || year > 2100)) {
            problem.accept("Jahrgang " + year + " ist unplausibel – leer gelassen");
            year = null;
        }
        if (mileage != null && mileage < 0) {
            problem.accept("Km-Stand ist negativ – leer gelassen");
            mileage = null;
        }
        return new VehicleDetails(row.get("Kennz"), row.get("Marke"), row.get("Typ"), row.get("Chassis-Nr."),
                firstRegistration, year, mileage, lastMfk, row.get("Farbe"), row.get("Treibstoff"));
    }

    /** The holders of one run: the SwissGarage customers known before, and what the run did about them. */
    private final class Holders {

        private final Map<String, Customer> byNumber = new HashMap<>();
        private final boolean addressListImported;
        private int created;
        private int activated;
        private final List<String> missing = new ArrayList<>();

        Holders(List<Customer> known) {
            known.forEach(c -> byNumber.put(c.getSwissgarageNumber(), c));
            addressListImported = !known.isEmpty();
        }

        /**
         * The holder of the row by its address number. One the address list did not bring is created
         * from the address on the vehicle, a deactivated one activated again. {@code null} without
         * address number or name – noted with the reason.
         */
        Customer of(ExcelRow row, String where) {
            String number = row.get(HOLDER);
            if (number.isEmpty()) {
                missing.add(where + "ohne Halter – keine Adressnummer beim Fahrzeug");
                return null;
            }
            Customer holder = byNumber.get(number);
            if (holder != null) {
                if (!holder.isActive()) {
                    holder.activate();
                    activated++;
                }
                return holder;
            }
            try {
                // saved right away: with its ID, "same holder" sees the change of a vehicle without one
                holder = customers.save(Customer.fromSwissGarage(number, CustomerImportService.details(row)));
            } catch (IllegalArgumentException e) {
                missing.add(where + "ohne Halter – Halter Nr. " + number + " ohne Name oder mit ungültigen Angaben beim Fahrzeug");
                return null;
            }
            byNumber.put(number, holder);
            created++;
            return holder;
        }

        boolean changed() {
            return created > 0 || activated > 0;
        }

        /** What happened to the holders, in reading order */
        List<String> messages() {
            List<String> messages = new ArrayList<>();
            if (created > 0) {
                messages.add(created + " Halter aus der Adresse beim Fahrzeug angelegt – " + (addressListImported
                        ? "in der Adressliste sind sie nicht als Garage-Kunde geführt (Adressart leer, gesperrt oder Lieferant). "
                        + "Die Adressliste nochmals importieren, damit gesperrte als «ehemalig» erscheinen."
                        : "die Adressliste ist noch nicht importiert. Sie ergänzt die Kunden, am besten jetzt importieren."));
            }
            if (activated > 0) {
                messages.add(activated + " frühere Kunden wieder aktiv – sie haben in SwissGarage noch ein Fahrzeug. "
                        + "Die Adressliste nochmals importieren, damit gesperrte als «ehemalig» erscheinen.");
            }
            messages.addAll(missing);
            return messages;
        }
    }

    private static <T> T convert(String value, Function<String, T> converter, String field,
                                 Consumer<String> problem) {
        try {
            return converter.apply(value);
        } catch (IllegalArgumentException e) {
            problem.accept(field + " «" + value + "»: " + e.getMessage() + " – leer gelassen");
            return null;
        }
    }

    private static boolean sameHolder(Vehicle vehicle, Customer holder) {
        // getCustomer().getId() does not load the customer (LAZY reference knows its ID)
        UUID current = vehicle.getCustomer() == null ? null : vehicle.getCustomer().getId();
        return Objects.equals(current, holder == null ? null : holder.getId());
    }

    private static ExcelSheet read(InputStream file) {
        try {
            return ExcelSheet.read(file);
        } catch (IOException | RuntimeException e) {
            throw new InvalidInputException("file",
                    "Die Datei konnte nicht gelesen werden. Bitte den Excel-Export (.xlsx) aus SwissGarage verwenden.");
        }
    }
}
