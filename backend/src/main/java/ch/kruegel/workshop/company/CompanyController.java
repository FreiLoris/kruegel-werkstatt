package ch.kruegel.workshop.company;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;

/** REST API for the company profile (name, address, logo). */
@RestController
@RequestMapping("/api/company")
@Tag(name = "Company")
class CompanyController {

    private final CompanyService service;

    CompanyController(CompanyService service) {
        this.service = service;
    }

    @Operation(summary = "Company profile")
    @GetMapping
    CompanyDto get() {
        return service.get();
    }

    @Operation(summary = "Change name and contact data", description = "Needs the loaded `version`.")
    @PutMapping
    CompanyDto update(@Valid @RequestBody CompanyRequest request) {
        return service.update(request);
    }

    @Operation(summary = "Upload the logo (PNG, JPEG, WebP or SVG, max. 1 MB)")
    @PutMapping(path = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    CompanyDto uploadLogo(@RequestParam("file") MultipartFile file) {
        try {
            return service.uploadLogo(file.getBytes());
        } catch (IOException e) {
            throw new InvalidInputException("file", "Die Datei konnte nicht gelesen werden.");
        }
    }

    @Operation(summary = "Remove the logo")
    @DeleteMapping("/logo")
    CompanyDto deleteLogo() {
        return service.deleteLogo();
    }

    /**
     * The logo itself. Cached for a long time: the URL in {@link CompanyDto#logoUrl()} changes with
     * every upload. The strict Content-Security-Policy keeps scripts in an SVG from running when
     * the image is opened directly.
     */
    @Operation(summary = "The logo image")
    @GetMapping("/logo")
    ResponseEntity<byte[]> logo() {
        CompanyLogoStore.Logo logo = service.logo().orElseThrow(() -> new NotFoundException("Es ist kein Logo hochgeladen."));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"logo\"")
                .body(logo.data());
    }
}
