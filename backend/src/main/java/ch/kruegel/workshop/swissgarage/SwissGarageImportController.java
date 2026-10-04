package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.web.InvalidInputException;
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
 * Upload of the SwissGarage Excel exports and the import log.
 * The vehicle list follows in 5d, the import page in 5f.
 */
@RestController
@RequestMapping("/api/swissgarage-imports")
@Tag(name = "SwissGarage import")
class SwissGarageImportController {

    static final String TOPIC = "swissgarage-imports";

    private final CustomerImportService customerImport;
    private final ImportRunRepository runs;

    SwissGarageImportController(CustomerImportService customerImport, ImportRunRepository runs) {
        this.customerImport = customerImport;
        this.runs = runs;
    }

    @Operation(summary = "Last 20 imports, newest first")
    @GetMapping
    List<ImportRunDto> list() {
        return runs.findTop20ByOrderByCreatedAtDesc().stream().map(ImportRunDto::of).toList();
    }

    @Operation(summary = "Import the SwissGarage address list (xlsx)",
            description = "Only \"Garage-Kunde\", not \"gesperrt\". Customers missing from the file are deactivated.")
    @ApiResponse(responseCode = "201", description = "Imported – the result is in the log entry")
    @PostMapping(path = "/customers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ImportRunDto importCustomers(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidInputException("file", "Die Datei ist leer.");
        }
        try (InputStream input = file.getInputStream()) {
            return customerImport.importAddressList(input, fileName(file));
        } catch (IOException e) {
            throw new InvalidInputException("file", "Die Datei konnte nicht gelesen werden.");
        }
    }

    private static String fileName(MultipartFile file) {
        String name = file.getOriginalFilename();
        return name == null || name.isBlank() ? "(ohne Namen)" : name;
    }
}
