package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Input for a label sheet format, sizes in mm to a hundredth. That the labels fit on A4 is checked
 * by the service.
 *
 * @param version only when editing: the version the device loaded (optimistic locking)
 */
public record LabelFormatRequest(
        @NotBlank @Size(max = LabelFormat.NAME_MAX) String name,
        @NotNull @Min(1) @Max(10) Integer columns,
        @NotNull @Min(1) @Max(30) Integer rows,
        @NotNull @DecimalMin("10") @DecimalMax("210") @Digits(integer = 3, fraction = 2) BigDecimal widthMm,
        @NotNull @DecimalMin("10") @DecimalMax("297") @Digits(integer = 3, fraction = 2) BigDecimal heightMm,
        @NotNull @DecimalMin("0") @DecimalMax("60") @Digits(integer = 2, fraction = 2) BigDecimal marginTop,
        @NotNull @DecimalMin("0") @DecimalMax("60") @Digits(integer = 2, fraction = 2) BigDecimal marginLeft,
        @NotNull @DecimalMin("0") @DecimalMax("30") @Digits(integer = 2, fraction = 2) BigDecimal gapX,
        @NotNull @DecimalMin("0") @DecimalMax("30") @Digits(integer = 2, fraction = 2) BigDecimal gapY,
        @Schema(description = "Only needed when editing") Long version) {

    LabelFormat.Layout layout() {
        return new LabelFormat.Layout(name.strip(), columns, rows, widthMm, heightMm, marginTop, marginLeft, gapX, gapY);
    }
}
