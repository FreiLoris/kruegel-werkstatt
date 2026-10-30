package ch.kruegel.workshop.dataimport;

import ch.kruegel.workshop.common.web.InvalidInputException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Customers and vehicles from the file of another program (neutral 5): first look at the columns,
 * then map them – a dry run, then the import. The SwissGarage import stays as it is.
 */
@RestController
@RequestMapping("/api/data-import")
@Tag(name = "Data import")
class DataImportController {

    private final DataImportService service;

    DataImportController(DataImportService service) {
        this.service = service;
    }

    @Operation(summary = "The columns of a CSV or Excel file, with their first values and a suggested field",
            description = "Nothing is stored.")
    @PostMapping(path = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    DataImportPreviewDto preview(@RequestParam("file") MultipartFile file,
                                 @RequestParam(name = "charset", required = false) String charset,
                                 @RequestParam(name = "firstRowIsData", defaultValue = "false") boolean firstRowIsData) {
        return service.preview(bytes(file), charset, firstRowIsData);
    }

    @Operation(summary = "Take over customers and vehicles with the given mapping",
            description = "Dry run (dryRun = true): only counts. Otherwise all or nothing. Customers and vehicles the app "
                    + "already has are left as they are – the import can be repeated.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    DataImportResultDto importFile(@RequestPart("file") MultipartFile file,
                                   @Valid @RequestPart("settings") DataImportRequest settings) {
        return service.importFile(bytes(file), settings);
    }

    private static byte[] bytes(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidInputException("file", "Die Datei ist leer.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new InvalidInputException("file", "Die Datei konnte nicht gelesen werden.");
        }
    }
}
