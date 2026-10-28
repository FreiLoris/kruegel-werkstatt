package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A supplier as delivered by the API. */
public record SupplierDto(
        UUID id,
        long version,
        String name,
        @Schema(types = {"string", "null"}) String phone,
        @Schema(types = {"string", "null"}) String email,
        @Schema(types = {"string", "null"}, description = "Always http(s)") String webshopUrl,
        @Schema(types = {"string", "null"}, description = "Our customer number with the supplier") String customerNumber,
        @Schema(types = {"string", "null"}) OrderChannel orderChannel,
        @Schema(types = {"string", "null"}, description = "Delivery times or rounds") String delivery,
        @Schema(types = {"string", "null"}) String remark,
        List<SupplierContactDto> contacts,
        List<SupplierDeliveryDto> deliveries,
        @Schema(description = "Its postal address (FB-31); fields empty when not known") SupplierAddressDto address,
        @Schema(types = {"object", "null"}, description = "Where returns go when not to the address; empty = there") SupplierAddressDto returnAddress,
        Instant updatedAt,
        @Schema(types = {"string", "null"}, format = "uuid", description = "Who changed it last") UUID updatedBy) {

    static SupplierDto of(Supplier s) {
        return new SupplierDto(s.getId(), s.getVersion(), s.getName(), s.getPhone(), s.getEmail(),
                s.getWebshopUrl(), s.getCustomerNumber(), s.getOrderChannel(), s.getDelivery(), s.getRemark(),
                s.getContacts().stream().map(SupplierContactDto::of).toList(),
                s.getDeliveries().stream().map(SupplierDeliveryDto::of).toList(),
                SupplierAddressDto.of(s.getAddress()),
                s.getReturnAddress().isEmpty() ? null : SupplierAddressDto.of(s.getReturnAddress()),
                s.getUpdatedAt(), s.getUpdatedBy());
    }
}
