package ch.kruegel.workshop.customersearch;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Customer search – step 1 of the order wizard. */
@RestController
@RequestMapping("/api/customer-search")
@Tag(name = "Customer search")
class CustomerSearchController {

    private final CustomerSearchService service;

    CustomerSearchController(CustomerSearchService service) {
        this.service = service;
    }

    @Operation(summary = "Search customers and vehicles",
            description = "Every word must occur (name, company, address, phone, e-mail, plate, make, VIN, SwissGarage number). "
                    + "Plates also without space. At least 2 characters. Only active customers and vehicles.")
    @GetMapping
    CustomerSearchResultDto search(@RequestParam String q, @RequestParam(defaultValue = "20") int limit) {
        return service.search(q, limit);
    }
}
