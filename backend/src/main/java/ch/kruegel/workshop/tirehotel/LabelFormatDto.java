package ch.kruegel.workshop.tirehotel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.UUID;

/** A label sheet format – sizes in mm. */
public record LabelFormatDto(
        UUID id,
        long version,
        String name,
        int columns,
        int rows,
        @Schema(example = "70") BigDecimal widthMm,
        @Schema(example = "37") BigDecimal heightMm,
        @Schema(description = "From the top edge of the sheet to the first label") BigDecimal marginTop,
        @Schema(description = "From the left edge of the sheet to the first label") BigDecimal marginLeft,
        @Schema(description = "Between two labels side by side") BigDecimal gapX,
        @Schema(description = "Between two labels one below the other") BigDecimal gapY) {

    static LabelFormatDto of(LabelFormat f) {
        LabelFormat.Layout l = f.getLayout();
        return new LabelFormatDto(f.getId(), f.getVersion(), l.name(), l.columns(), l.rows(), l.widthMm(), l.heightMm(), l.marginTop(),
                l.marginLeft(), l.gapX(), l.gapY());
    }
}
