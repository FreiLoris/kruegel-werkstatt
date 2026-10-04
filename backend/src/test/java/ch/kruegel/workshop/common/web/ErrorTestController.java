package ch.kruegel.workshop.common.web;

import ch.kruegel.workshop.common.persistence.StaleVersionException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Test only: deliberately triggers every kind of error so {@link GlobalExceptionHandler}
 * can be checked independently of the business endpoints.
 */
@RestController
@RequestMapping("/test/errors")
class ErrorTestController {

    record Input(@NotBlank String name, @Size(max = 5) String code) {
    }

    @PostMapping("/validation")
    void validation(@Valid @RequestBody Input input) {
        // Only valid input gets here
    }

    @GetMapping("/not-found")
    void notFound() {
        throw new NotFoundException("Mitarbeiter", UUID.fromString("00000000-0000-0000-0000-000000000001"));
    }

    @GetMapping("/conflict")
    void conflict() {
        throw new StaleVersionException(1, 2);
    }

    @GetMapping("/crash")
    void crash() {
        throw new IllegalStateException("secret technical details");
    }
}
