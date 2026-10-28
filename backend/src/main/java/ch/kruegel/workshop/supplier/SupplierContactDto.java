package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/** A contact at a supplier (FB-30) – in and out of the API. At least one of department, name, phone, mobile, e-mail. */
public record SupplierContactDto(
        @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}, example = "Verkauf Innendienst") String department,
        @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}) String name,
        @Size(max = Supplier.PHONE_MAX) @Schema(types = {"string", "null"}, description = "Direct line") String phone,
        @Size(max = Supplier.PHONE_MAX) @Schema(types = {"string", "null"}) String mobile,
        @Email @Size(max = Supplier.NAME_MAX) @Schema(types = {"string", "null"}) String email,
        @Size(max = SupplierContact.REMARK_MAX) @Schema(types = {"string", "null"}) String remark) {

    static SupplierContactDto of(SupplierContact c) {
        return new SupplierContactDto(c.department(), c.name(), c.phone(), c.mobile(), c.email(), c.remark());
    }

    SupplierContact toContact() {
        return new SupplierContact(department, name, phone, mobile, email, remark);
    }
}
