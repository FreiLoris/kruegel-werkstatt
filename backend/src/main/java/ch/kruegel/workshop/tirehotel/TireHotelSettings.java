package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * When a tread depth is worth a word with the customer (FB-07) – exactly one row (migration V32).
 * Below the season's limit: "Kunde ansprechen"; below the legal minimum: not allowed on the road.
 * All-season tyres count like winter tyres – they are driven in winter.
 */
@Entity
public class TireHotelSettings extends BaseEntity {

    static final BigDecimal MAX = BigDecimal.valueOf(20);

    @Column(nullable = false)
    private BigDecimal summerMm;

    @Column(nullable = false)
    private BigDecimal winterMm;

    @Column(nullable = false)
    private BigDecimal minimumMm;

    protected TireHotelSettings() {
        // for JPA
    }

    public void update(BigDecimal summer, BigDecimal winter, BigDecimal minimum) {
        Objects.requireNonNull(summer, "summer");
        Objects.requireNonNull(winter, "winter");
        Objects.requireNonNull(minimum, "minimum");
        if (minimum.signum() <= 0 || minimum.compareTo(summer) > 0 || minimum.compareTo(winter) > 0
                || summer.compareTo(MAX) > 0 || winter.compareTo(MAX) > 0) {
            throw new IllegalArgumentException("Limits out of order: %s/%s/%s".formatted(summer, winter, minimum));
        }
        this.summerMm = summer.setScale(1, RoundingMode.HALF_UP);
        this.winterMm = winter.setScale(1, RoundingMode.HALF_UP);
        this.minimumMm = minimum.setScale(1, RoundingMode.HALF_UP);
    }

    public BigDecimal getSummerMm() {
        return summerMm;
    }

    public BigDecimal getWinterMm() {
        return winterMm;
    }

    public BigDecimal getMinimumMm() {
        return minimumMm;
    }
}
