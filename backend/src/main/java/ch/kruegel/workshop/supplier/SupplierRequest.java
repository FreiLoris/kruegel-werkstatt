package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Input for creating and editing a supplier.
 *
 * @param webshopUrl without "https://" it is added; other schemes are refused
 * @param version    only when editing
 */
public record SupplierRequest(
        @NotBlank @Size(max = Supplier.NAME_MAX) String name,
        @Size(max = Supplier.PHONE_MAX) String phone,
        @Email @Size(max = Supplier.NAME_MAX) String email,
        @Size(max = Supplier.URL_MAX) String webshopUrl,
        @Size(max = Supplier.CODE_MAX) String customerNumber,
        @Schema(types = {"string", "null"}) OrderChannel orderChannel,
        @Size(max = Supplier.NAME_MAX) @Schema(description = "Delivery times or rounds, e.g. \"2× täglich\"") String delivery,
        @Size(max = Supplier.REMARK_MAX) String remark,
        @Size(max = 20) @Schema(description = "Departments and people (FB-30); missing = none") List<@Valid SupplierContactDto> contacts,
        @Size(max = 20) @Schema(description = "Ways it delivers (FB-30); missing = none") List<@Valid SupplierDeliveryDto> deliveries,
        @Schema(description = "Only needed when editing") Long version) {
}
