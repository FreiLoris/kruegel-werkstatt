package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** A postal address of a supplier (FB-31) – in and out of the API. */
public record SupplierAddressDto(
        @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}, description = "Only for the return address, e.g. \"Zentrallager\"")
        String name,
        @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}) String street,
        @Size(max = SupplierAddress.POSTAL_CODE_MAX) @Schema(types = {"string", "null"}) String postalCode,
        @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}) String city) {

    static SupplierAddressDto of(SupplierAddress a) {
        return new SupplierAddressDto(a.name(), a.street(), a.postalCode(), a.city());
    }

    SupplierAddress toAddress() {
        return new SupplierAddress(name, street, postalCode, city);
    }
}
