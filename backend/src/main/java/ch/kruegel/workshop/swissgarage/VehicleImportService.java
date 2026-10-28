package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
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

        Map<String, Customer> holders = new HashMap<>();
        customers.findBySource(RecordSource.SWISSGARAGE).forEach(c -> holders.put(c.getSwissgarageNumber(), c));
        Map<String, Vehicle> known = new HashMap<>();
        vehicles.findBySource(RecordSource.SWISSGARAGE).forEach(v -> known.put(v.getSwissgarageNumber(), v));
        long knownActive = known.values().stream().filter(Vehicle::isActive).count();

        int rowsRead = 0, skipped = 0, created = 0, updated = 0, unchanged = 0;
        List<String> problems = new ArrayList<>();
        List<String> withoutHolder = new ArrayList<>();
        List<Customer> newHolders = new ArrayList<>();
        List<Customer> activatedHolders = new ArrayList<>();
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
            Customer holder = holders.get(row.get(HOLDER));
            if (holder == null) {
                holder = newHolder(row, reason -> withoutHolder.add(where + "ohne Halter – " + reason));
                if (holder != null) {
                    // saved right away: with its ID, "same holder" below sees the change
                    holder = customers.save(holder);
                    holders.put(holder.getSwissgarageNumber(), holder);
                    newHolders.add(holder);
                }
            } else if (!holder.isActive()) {
                holder.activate();
                activatedHolders.add(holder);
            }

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
        if (!withoutHolder.isEmpty()) {
            problems.addAll(0, withoutHolder);
        }
        if (!activatedHolders.isEmpty()) {
            problems.addFirst(activatedHolders.size() + " frühere Kunden wieder aktiv – sie haben in SwissGarage noch ein Fahrzeug.");
        }
        if (!newHolders.isEmpty()) {
            problems.addFirst(newHolders.size() + " Halter aus der Adresse beim Fahrzeug angelegt – in der Adressliste "
                    + "sind sie nicht als Garage-Kunde geführt (Adressart leer, gesperrt oder Lieferant).");
        }

        List<Vehicle> missing = known.values().stream()
                .filter(v -> v.isActive() && !seen.contains(v.getSwissgarageNumber()))
                .toList();
        ImportGuard.checkDeactivations(knownActive, missing.size(), "Fahrzeugen");
        missing.forEach(Vehicle::deactivate);

        vehicles.saveAll(toSave);
        vehicles.flush();
        ImportRun run = runs.save(new ImportRun(ImportRun.Kind.VEHICLES, fileName,
                new ImportCounts(rowsRead, skipped, created, updated, unchanged, missing.size(), problems)));
        runs.flush();
        events.publishEvent(new DataChanged("vehicles"));
        if (!newHolders.isEmpty() || !activatedHolders.isEmpty()) {
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

    /**
     * A holder the address list did not bring, from the address on the vehicle (same columns as the
     * address list, phone as "Telefon 1"). {@code null} with the reason without number or name.
     */
    private static Customer newHolder(ExcelRow row, Consumer<String> missing) {
        String number = row.get(HOLDER);
        if (number.isEmpty()) {
            missing.accept("keine Adressnummer beim Fahrzeug");
            return null;
        }
        try {
            return Customer.fromSwissGarage(number, new CustomerDetails(row.get("Anrede"), row.get("Vorname"),
                    row.get("Name"), null, row.get("Zusatz"), row.get("Strasse"), row.get("PLZ"), row.get("Ort"),
                    row.get("Telefon 1"), row.get("Handy"), row.get("E-Mail")));
        } catch (IllegalArgumentException e) {
            missing.accept("Halter Nr. " + number + " ohne Name oder mit ungültigen Angaben beim Fahrzeug");
            return null;
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
