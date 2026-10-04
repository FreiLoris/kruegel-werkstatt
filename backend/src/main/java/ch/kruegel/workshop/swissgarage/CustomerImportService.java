package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerDetails;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.swissgarage.ExcelSheet.ExcelRow;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Imports the SwissGarage address list ("Adrliste.xlsx", export: Adressen → Export → Excel).
 *
 * <p>Rules (ADR 0003, old app):
 * <ul>
 *   <li>Only addresses of the kind "Garage-Kunde" that are not "gesperrt" (suppliers etc. are skipped).</li>
 *   <li>Matched by SwissGarage address number: new → created, changed → updated, same → untouched.</li>
 *   <li>SwissGarage customers missing from the export are deactivated – never deleted.</li>
 *   <li>Local customers are never touched.</li>
 *   <li>Like the old app, no company detection: "Name" → last name, "Vorname" → first name.</li>
 * </ul>
 *
 * <p>Everything in one transaction: either the whole file is imported or nothing.
 */
@Service
public class CustomerImportService {

    private static final String NUMBER = "Adressnummer";
    private static final String LAST_NAME = "Name";

    private final CustomerRepository customers;
    private final ImportRunRepository runs;
    private final ApplicationEventPublisher events;

    CustomerImportService(CustomerRepository customers, ImportRunRepository runs, ApplicationEventPublisher events) {
        this.customers = customers;
        this.runs = runs;
        this.events = events;
    }

    @Transactional
    public ImportRunDto importAddressList(InputStream file, String fileName) {
        ExcelSheet sheet = read(file);
        if (!sheet.hasColumn(NUMBER) || !sheet.hasColumn(LAST_NAME)) {
            throw new InvalidInputException("file",
                    "Das ist keine SwissGarage-Adressliste: Spalte «" + NUMBER + "» oder «" + LAST_NAME + "» fehlt.");
        }

        Map<String, Customer> known = new HashMap<>();
        customers.findBySource(RecordSource.SWISSGARAGE).forEach(c -> known.put(c.getSwissgarageNumber(), c));
        long knownActive = known.values().stream().filter(Customer::isActive).count();

        int rowsRead = 0, skipped = 0, created = 0, updated = 0, unchanged = 0;
        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        List<Customer> toSave = new ArrayList<>();

        for (ExcelRow row : sheet.rows()) {
            if (row.isEmpty()) {
                continue;
            }
            rowsRead++;
            if (!isGarageCustomer(row)) {
                skipped++;
                continue;
            }
            String number = row.get(NUMBER);
            if (number.isEmpty()) {
                skipped++;
                problems.add("Zeile " + row.number() + ": keine Adressnummer");
                continue;
            }
            if (!seen.add(number)) {
                skipped++;
                problems.add("Zeile " + row.number() + ": Adressnummer " + number + " kommt mehrfach vor");
                continue;
            }
            CustomerDetails details;
            try {
                details = details(row);
            } catch (IllegalArgumentException e) {
                skipped++;
                String reason = row.get(LAST_NAME).isEmpty() ? "kein Name" : "ungültige Angaben (z. B. Text zu lang)";
                problems.add("Zeile " + row.number() + " (Adressnummer " + number + "): " + reason);
                continue;
            }

            Customer existing = known.get(number);
            if (existing == null) {
                toSave.add(Customer.fromSwissGarage(number, details));
                created++;
            } else if (existing.isActive() && existing.getDetails().equals(details)) {
                unchanged++;
            } else {
                existing.updateFromSwissGarage(details);
                updated++;
            }
        }

        if (seen.isEmpty()) {
            throw new InvalidInputException("file", "Die Datei enthält keine Garage-Kunden – nichts importiert.");
        }

        List<Customer> missing = known.values().stream()
                .filter(c -> c.isActive() && !seen.contains(c.getSwissgarageNumber()))
                .toList();
        ImportGuard.checkDeactivations(knownActive, missing.size(), "Kunden");
        missing.forEach(Customer::deactivate);

        customers.saveAll(toSave);
        customers.flush();
        ImportRun run = runs.save(new ImportRun(ImportRun.Kind.CUSTOMERS, fileName,
                new ImportCounts(rowsRead, skipped, created, updated, unchanged, missing.size(), problems)));
        runs.flush();
        events.publishEvent(new DataChanged("customers"));
        events.publishEvent(new DataChanged(SwissGarageImportController.TOPIC));
        return ImportRunDto.of(run);
    }

    /** Like the old app: address kind contains "Garage-Kunde" and not "gesperrt". */
    private static boolean isGarageCustomer(ExcelRow row) {
        String kind = row.get("Adressart").toLowerCase(Locale.ROOT);
        return kind.contains("garage-kunde") && !kind.contains("gesperrt");
    }

    /** Throws IllegalArgumentException without a name (rule of {@link CustomerDetails}). */
    private static CustomerDetails details(ExcelRow row) {
        return new CustomerDetails(
                row.get("Anrede"),
                row.get("Vorname"),
                row.get(LAST_NAME),
                null,
                row.get("Zusatz"),
                row.get("Strasse"),
                row.get("PLZ"),
                row.get("Ort"),
                row.get("Tel.1", "Telefon 1"),
                row.get("Handy"),
                row.get("E-Mail"));
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
