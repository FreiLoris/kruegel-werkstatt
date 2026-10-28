package ch.kruegel.workshop.supplier;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalTime;

/** One way a supplier delivers (FB-30) – in and out of the API. */
public record SupplierDeliveryDto(
        @NotBlank @Size(max = SupplierDelivery.KIND_MAX) @Schema(example = "Tagesexpress") String kind,
        @Schema(types = {"string", "null"}, format = "time", description = "Order until") LocalTime orderDeadline,
        @Size(max = SupplierDelivery.TOUR_MAX) @Schema(types = {"string", "null"}, example = "Tour 1") String tour,
        @Schema(types = {"string", "null"}, format = "time", description = "About when it is here") LocalTime arrival,
        @Schema(description = "The arrival is on the next working day; missing = false") Boolean arrivalNextDay,
        @DecimalMin("0") @DecimalMax("999999.99") @Schema(types = {"number", "null"}, description = "CHF") BigDecimal postage,
        @Size(max = SupplierDelivery.REMARK_MAX) @Schema(types = {"string", "null"}, example = "ab CHF 100 gratis") String remark) {

    public SupplierDeliveryDto {
        arrivalNextDay = Boolean.TRUE.equals(arrivalNextDay);
    }

    static SupplierDeliveryDto of(SupplierDelivery d) {
        return new SupplierDeliveryDto(d.kind(), d.orderDeadline(), d.tour(), d.arrival(), d.arrivalNextDay(), d.postage(), d.remark());
    }

    SupplierDelivery toDelivery() {
        return new SupplierDelivery(kind, orderDeadline, tour, arrival, arrivalNextDay, postage, remark);
    }
}
