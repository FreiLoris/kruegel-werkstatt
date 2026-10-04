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
import java.util.List;

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
    private final ImportRunRepository runs;
    private final CustomerRepository customers;
    private final VehicleRepository vehicles;

    SwissGarageImportController(CustomerImportService customerImport, VehicleImportService vehicleImport,
                                ImportRunRepository runs, CustomerRepository customers, VehicleRepository vehicles) {
        this.customerImport = customerImport;
        this.vehicleImport = vehicleImport;
        this.runs = runs;
        this.customers = customers;
        this.vehicles = vehicles;
    }

    @Operation(summary = "Last 20 imports, newest first")
    @GetMapping
    List<ImportRunDto> list() {
        return runs.findTop20ByOrderByCreatedAtDesc().stream().map(ImportRunDto::of).toList();
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
