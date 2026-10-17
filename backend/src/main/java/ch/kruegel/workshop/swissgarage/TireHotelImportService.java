package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.LicensePlates;
import ch.kruegel.workshop.common.live.DataChanged;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.Customer;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.swissgarage.ExcelSheet.ExcelRow;
import ch.kruegel.workshop.tirehotel.RimKind;
import ch.kruegel.workshop.tirehotel.Season;
import ch.kruegel.workshop.tirehotel.TireSet;
import ch.kruegel.workshop.tirehotel.TireSetDetails;
import ch.kruegel.workshop.tirehotel.TireSetKind;
import ch.kruegel.workshop.tirehotel.TireSetRepository;
import ch.kruegel.workshop.tirehotel.TreadDepths;
import ch.kruegel.workshop.vehicle.Vehicle;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The one-off takeover of the SwissGarage tyre hotel ("Pneuhotel.xlsx", FB-07): the tyre hotel is
 * run in the app from now on, SwissGarage's is given up (confirmed by the workshop).
 *
 * <p>Rules:
 * <ul>
 *   <li>Plate ("Kennzeichen") → the vehicle and its holder. Without a match (or a vehicle without
 *       holder) the customer is looked up by name ("Kunde"), whatever the order of the words – only a
 *       single hit counts. Without a customer the row is not taken (logged): a set needs one.</li>
 *   <li>"Art" → season (Sommer/Winter) and rims (Alu-/Stahlfelgen → complete wheels; none → tyres only).</li>
 *   <li>"Reifen" (free text) → the dimension by its pattern ("205/55 R16 91H"), the rest brand and model.</li>
 *   <li>The depths VL/VR/HL/HR; "vorne/hinten ok" is not needed – the app judges by its limits.</li>
 *   <li>Everything else worth keeping (second block, RDKS, remarks, the old place) goes into the
 *       remark. No place: the old places do not fit – they are assigned afterwards.</li>
 *   <li>A second run takes nothing twice: a set of the same customer, vehicle and season already in
 *       the hotel counts as "unchanged".</li>
 * </ul>
 */
@Service
public class TireHotelImportService {

    /** "205/55 R16 91H", "205/55R16", "225/45 ZR17 94W", "195/65 R15 C 102/100T" – case-insensitive */
    static final Pattern DIMENSION = Pattern.compile(
            "\\d{3}/\\d{2}\\s*Z?R\\s*\\d{2}(?:\\s*C)?(?:\\s*\\d{2,3}(?:/\\d{2,3})?\\s*[A-Z]{1,2}|[A-Z](?![A-Z]))?", Pattern.CASE_INSENSITIVE);
    private static final BigDecimal MAX_DEPTH = BigDecimal.valueOf(20);
    private static final int NAME_MAX = 60;
    private static final int REMARK_MAX = 500;

    private final TireSetRepository sets;
    private final VehicleRepository vehicles;
    private final CustomerRepository customers;
    private final ImportRunRepository runs;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    TireHotelImportService(TireSetRepository sets, VehicleRepository vehicles, CustomerRepository customers, ImportRunRepository runs,
                           ApplicationEventPublisher events, Clock clock) {
        this.sets = sets;
        this.vehicles = vehicles;
        this.customers = customers;
        this.runs = runs;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public ImportRunDto importTireHotel(InputStream file, String fileName) {
        ExcelSheet sheet = read(file);
        if (!sheet.hasColumn("Kennzeichen") || !sheet.hasColumn("Kunde") || !sheet.hasColumn("Art")) {
            throw new InvalidInputException("file",
                    "Das ist kein SwissGarage-Pneuhotel: Spalte «Kennzeichen», «Kunde» oder «Art» fehlt.");
        }

        // a plate is not unique (it moves with the holder to the next car) – only a single vehicle counts
        Map<String, List<Vehicle>> byPlate = vehicles.findAll().stream()
                .filter(Vehicle::isActive)
                .filter(v -> v.getDetails().licensePlate() != null)
                .collect(Collectors.groupingBy(v -> LicensePlates.normalize(v.getDetails().licensePlate())));
        Map<String, List<Customer>> byName = customers.findAll().stream()
                .filter(Customer::isActive)
                .collect(Collectors.groupingBy(c -> nameKey(c.getDetails().displayName())));
        // what is in the hotel already: customer / vehicle / season
        Set<String> present = new HashSet<>();
        sets.inHotel().forEach(s -> present.add(key(s.getCustomer(), s.getVehicle(), s.getDetails().season())));

        LocalDate today = LocalDate.now(clock);
        int rowsRead = 0, skipped = 0, created = 0, unchanged = 0;
        List<String> problems = new ArrayList<>();
        List<TireSet> toSave = new ArrayList<>();

        for (ExcelRow row : sheet.rows()) {
            if (row.isEmpty()) {
                continue;
            }
            rowsRead++;
            String where = "Zeile " + row.number() + ": ";
            Consumer<String> problem = message -> problems.add(where + message);

            Season season = season(row.get("Art"));
            if (season == null) {
                skipped++;
                problem.accept("Saison aus «Art» nicht erkannt («" + row.get("Art") + "») – nicht übernommen");
                continue;
            }
            LocalDate storedOn;
            try {
                storedOn = ExcelValues.date(row.get("Datum"));
            } catch (IllegalArgumentException e) {
                storedOn = null;
            }
            if (storedOn == null || storedOn.isAfter(today)) {
                skipped++;
                problem.accept("kein gültiges Einlagerungsdatum – nicht übernommen");
                continue;
            }

            String plate = LicensePlates.normalize(row.get("Kennzeichen"));
            int withPlate = plate == null ? 0 : byPlate.getOrDefault(plate, List.of()).size();
            Vehicle vehicle = withPlate == 1 ? byPlate.get(plate).getFirst() : null;
            Customer customer = vehicle == null ? null : vehicle.getCustomer();
            if (customer == null) {
                List<Customer> named = byName.getOrDefault(nameKey(row.get("Kunde")), List.of());
                if (named.size() == 1) {
                    customer = named.getFirst();
                } else {
                    skipped++;
                    problem.accept((named.isEmpty() ? "Kunde nicht gefunden" : "Kunde nicht eindeutig (" + named.size() + " Treffer)")
                            + (plate == null ? "" : ", Kennzeichen " + plate + (vehicle != null ? " ohne Halter"
                                    : withPlate > 1 ? " bei " + withPlate + " Fahrzeugen" : " unbekannt"))
                            + " – nicht übernommen, bitte von Hand einlagern");
                    continue;
                }
            }
            if (!present.add(key(customer, vehicle, season))) {
                unchanged++;
                continue;
            }

            String art = row.get("Art").toLowerCase(Locale.ROOT);
            RimKind rims = art.contains("alu") ? RimKind.ALU : art.contains("stahl") ? RimKind.STEEL : null;
            Tyres tyres = tyres(row.get("Reifen"));
            List<String> remark = new ArrayList<>();
            if (vehicle == null && plate != null) {
                remark.add("Kennzeichen laut SwissGarage: " + plate + (row.get("Marke/Typ").isEmpty() ? "" : " (" + row.get("Marke/Typ") + ")"));
            }
            if ("2".equals(row.get("Anzahl"))) {
                remark.add("2 Stück");
            }
            String second = String.join(" ", nonEmpty(row.get("Anzahl#2").isEmpty() ? "" : row.get("Anzahl#2") + " ×",
                    row.get("Art#2"), row.get("Reifen#2")));
            if (!second.isBlank()) {
                remark.add("Zweiter Eintrag SwissGarage: " + second);
            }
            if ("J".equalsIgnoreCase(row.get("RDKS"))) {
                remark.add("RDKS-Sensoren");
            }
            remark.addAll(nonEmpty(row.get("Bemerkung")));
            if (!row.get("Bem.Sommer").isEmpty()) {
                remark.add("Sommer: " + row.get("Bem.Sommer"));
            }
            if (!row.get("Bem.Winter").isEmpty()) {
                remark.add("Winter: " + row.get("Bem.Winter"));
            }
            if (!row.get("Lagerort").isEmpty()) {
                remark.add("Alter Lagerort: " + row.get("Lagerort"));
            }

            TireSetDetails details = new TireSetDetails(customer, vehicle, season, rims == null ? TireSetKind.TIRES : TireSetKind.WHEELS, rims,
                    false, false, tyres.brand(), tyres.model(), tyres.dimension(), null, cut(String.join(" · ", remark), REMARK_MAX));
            TreadDepths depths = new TreadDepths(depth(row.get("VL"), "VL", problem), depth(row.get("VR"), "VR", problem),
                    depth(row.get("HL"), "HL", problem), depth(row.get("HR"), "HR", problem));
            toSave.add(new TireSet(details, depths, storedOn, null, "Aus dem SwissGarage-Pneuhotel übernommen"));
            created++;
            if (withPlate > 1) {
                problem.accept("Kennzeichen " + plate + " gehört zu " + withPlate + " Fahrzeugen – ohne Fahrzeug übernommen, bitte zuordnen");
            }
        }

        if (rowsRead == 0) {
            throw new InvalidInputException("file", "Die Datei enthält keine Sätze – nichts importiert.");
        }
        if (created > 0) {
            problems.addFirst(created + " Sätze ohne Lagerplatz übernommen – im Pneuhotel unter «Ohne Platz» zuweisen.");
        }
        sets.saveAll(toSave);
        sets.flush();
        ImportRun run = runs.save(new ImportRun(ImportRun.Kind.TIRE_HOTEL, fileName,
                new ImportCounts(rowsRead, skipped, created, 0, unchanged, 0, problems)));
        runs.flush();
        events.publishEvent(new DataChanged("tire-sets"));
        events.publishEvent(new DataChanged(SwissGarageImportController.TOPIC));
        return ImportRunDto.of(run);
    }

    /** "Sommer-Alufelgen" → summer, "Winter-" → winter; all-season tyres are rare and named differently */
    static Season season(String art) {
        String text = art.toLowerCase(Locale.ROOT);
        if (text.startsWith("sommer")) {
            return Season.SUMMER;
        }
        if (text.startsWith("winter")) {
            return Season.WINTER;
        }
        if (text.startsWith("ganzjahr") || text.startsWith("allwetter") || text.startsWith("4-saison")) {
            return Season.ALL_SEASON;
        }
        return null;
    }

    record Tyres(String brand, String model, String dimension) {
    }

    /** "Michelin Alpin 6 205/55R16 91H" → Michelin / Alpin 6 / 205/55R16 91H – the text around the dimension is brand and model */
    static Tyres tyres(String text) {
        String clean = text.strip().replaceAll("\\s+", " ");
        if (clean.isEmpty()) {
            return new Tyres(null, null, null);
        }
        Matcher m = DIMENSION.matcher(clean);
        String dimension = null;
        String rest = clean;
        if (m.find()) {
            dimension = m.group().toUpperCase(Locale.ROOT);
            rest = (clean.substring(0, m.start()) + " " + clean.substring(m.end())).strip().replaceAll("\\s+", " ");
        }
        if (rest.isEmpty()) {
            return new Tyres(null, null, cut(dimension, 40));
        }
        int space = rest.indexOf(' ');
        String brand = space < 0 ? rest : rest.substring(0, space);
        String model = space < 0 ? null : rest.substring(space + 1);
        return new Tyres(cut(brand, NAME_MAX), cut(model, NAME_MAX), cut(dimension, 40));
    }

    /** In mm, one decimal; empty or impossible → not measured (an impossible one is logged) */
    private static BigDecimal depth(String value, String wheel, Consumer<String> problem) {
        if (value.isBlank()) {
            return null;
        }
        try {
            BigDecimal depth = new BigDecimal(value.strip().replace(',', '.')).setScale(1, RoundingMode.HALF_UP);
            if (depth.signum() >= 0 && depth.compareTo(MAX_DEPTH) <= 0) {
                return depth;
            }
        } catch (NumberFormatException ignored) {
            // logged below
        }
        problem.accept("Profiltiefe " + wheel + " «" + value + "» unplausibel – leer gelassen");
        return null;
    }

    /** The words of a name, lower case, sorted: "Huber Peter" and "Peter Huber" are the same */
    static String nameKey(String name) {
        return Arrays.stream(name.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(w -> !w.isBlank())
                .sorted()
                .collect(Collectors.joining(" "));
    }

    private static String key(Customer customer, Vehicle vehicle, Season season) {
        return customer.getId() + "/" + (vehicle == null ? "-" : vehicle.getId()) + "/" + season;
    }

    private static List<String> nonEmpty(String... values) {
        return Arrays.stream(values).filter(Objects::nonNull).filter(v -> !v.isBlank()).toList();
    }

    private static String cut(String text, int max) {
        if (text == null || text.isBlank()) {
            return null;
        }
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
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
