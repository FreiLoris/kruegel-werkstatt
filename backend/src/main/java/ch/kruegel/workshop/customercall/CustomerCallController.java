package ch.kruegel.workshop.customercall;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** REST API of the calls to customers (FB-16, FB-21). */
@RestController
@Tag(name = "Customer calls")
class CustomerCallController {

    private final CustomerCallService service;

    CustomerCallController(CustomerCallService service) {
        this.service = service;
    }

    @Operation(summary = "The latest call of each customer", description = "Customers never called are left out.")
    @GetMapping("/api/customer-calls/latest")
    List<CustomerCallDto> latest(@RequestParam List<UUID> customerIds) {
        return service.latest(customerIds);
    }

    @Operation(summary = "Note a call to the customer", description = "When and who: now and the person of the device.")
    @PostMapping("/api/customers/{customerId}/calls")
    @ResponseStatus(HttpStatus.CREATED)
    CustomerCallDto call(@PathVariable UUID customerId, @Valid @RequestBody CustomerCallRequest request) {
        return service.call(customerId, request);
    }

    @Operation(summary = "Delete a call noted by mistake")
    @DeleteMapping("/api/customer-calls/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
