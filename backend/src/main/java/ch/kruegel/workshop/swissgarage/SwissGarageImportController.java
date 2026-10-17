package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.RecordSource;
import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.customer.CustomerRepository;
import ch.kruegel.workshop.vehicle.VehicleRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Upload of the SwissGarage Excel exports, the import log and the current data status.
 * Order: address list first, then vehicle list (vehicles are linked to the imported customers).
 */
@RestController
@RequestMapping("/api/swissgarage-imports")
@Tag(name = "SwissGarage import")
class SwissGarageImportController {

    static final String TOPIC = "swissgarage-imports";

    private final CustomerImportService customerImport;
    private final VehicleImportService vehicleImport;
    private final TireHotelImportService tireHotelImport;
    private final ImportRunRepository runs;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;

    SwissGarageImportController(CustomerImportService customerImport, VehicleImportService vehicleImport,
                                TireHotelImportService tireHotelImport, ImportRunRepository runs, CustomerRepository customers,
                                VehicleRepository vehicles) {
        this.customerImport = customerImport;
        this.vehicleImport = vehicleImport;
        this.tireHotelImport = tireHotelImport;
        this.runs = runs;
        this.customers = customers;
        this.vehicles = vehicles;
    }

    @Operation(summary = "Last 20 imports and the latest of every kind, newest first")
    @GetMapping
    List<ImportRunDto> list() {
        // the latest of every kind too: the one-off tyre hotel run would otherwise drop out after
        // a few address/vehicle imports and its card would say "Noch nie importiert"
        Map<UUID, ImportRun> shown = new LinkedHashMap<>();
        runs.findTop20ByOrderByCreatedAtDesc().forEach(run -> shown.put(run.getId(), run));
        Arrays.stream(ImportRun.Kind.values())
                .flatMap(kind -> runs.findFirstByKindOrderByCreatedAtDesc(kind).stream())
                .forEach(run -> shown.putIfAbsent(run.getId(), run));
        return shown.values().stream()
                .sorted(Comparator.comparing(ImportRun::getCreatedAt).reversed())
                .map(ImportRunDto::of)
                .toList();
    }

    @Operation(summary = "How many SwissGarage customers and vehicles are active")
    @GetMapping("/status")
    SwissGarageStatusDto status() {
        return new SwissGarageStatusDto(
                customers.countBySourceAndActiveTrue(RecordSource.SWISSGARAGE),
                vehicles.countBySourceAndActiveTrue(RecordSource.SWISSGARAGE),
                vehicles.countBySourceAndActiveTrueAndCustomerIsNull(RecordSource.SWISSGARAGE));
    }

    @Operation(summary = "Import the SwissGarage address list (xlsx)",
            description = "Only \"Garage-Kunde\", not \"gesperrt\". Customers missing from the file are deactivated.")
    @ApiResponse(responseCode = "201", description = "Imported – the result is in the log entry")
    @PostMapping(path = "/customers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ImportRunDto importCustomers(@RequestParam("file") MultipartFile file) {
        return withInput(file, input -> customerImport.importAddressList(input, fileName(file)));
    }

    @Operation(summary = "Import the SwissGarage vehicle list (xlsx)",
            description = "Import the address list first – holders are matched by address number. "
                    + "Vehicles missing from the file are deactivated.")
    @ApiResponse(responseCode = "201", description = "Imported – the result is in the log entry")
    @PostMapping(path = "/vehicles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ImportRunDto importVehicles(@RequestParam("file") MultipartFile file) {
        return withInput(file, input -> vehicleImport.importVehicleList(input, fileName(file)));
    }

    @Operation(summary = "Take over the SwissGarage tyre hotel once (xlsx)",
            description = "Import address and vehicle list first – the sets are matched by plate, else by customer name. "
                    + "The sets get no place; a second run takes nothing twice.")
    @ApiResponse(responseCode = "201", description = "Imported – the result is in the log entry")
    @PostMapping(path = "/tire-hotel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ImportRunDto importTireHotel(@RequestParam("file") MultipartFile file) {
        return withInput(file, input -> tireHotelImport.importTireHotel(input, fileName(file)));
    }

    private interface Importer {
        ImportRunDto run(InputStream input);
    }

    private static ImportRunDto withInput(MultipartFile file, Importer importer) {
        if (file.isEmpty()) {
            throw new InvalidInputException("file", "Die Datei ist leer.");
        }
        try (InputStream input = file.getInputStream()) {
            return importer.run(input);
        } catch (IOException e) {
            throw new InvalidInputException("file", "Die Datei konnte nicht gelesen werden.");
        }
    }

    private static String fileName(MultipartFile file) {
        String name = file.getOriginalFilename();
        return name == null || name.isBlank() ? "(ohne Namen)" : name;
    }
}
