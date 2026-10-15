package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * The layout of an A4 label sheet in mm (FB-07): how many labels, how big, where the first one
 * starts and the space between them. The labels of a tyre set are printed on it.
 */
@Entity
public class LabelFormat extends BaseEntity {

    static final int NAME_MAX = 80;
    static final BigDecimal A4_WIDTH = BigDecimal.valueOf(210);
    static final BigDecimal A4_HEIGHT = BigDecimal.valueOf(297);

    @Column(nullable = false)
    private String name;

    private int columns;
    private int rows;

    @Column(name = "width_mm", nullable = false)
    private BigDecimal widthMm;

    @Column(name = "height_mm", nullable = false)
    private BigDecimal heightMm;

    @Column(nullable = false)
    private BigDecimal marginTop;

    @Column(nullable = false)
    private BigDecimal marginLeft;

    // explicit: the naming strategy would make "gapx" of "gapX"
    @Column(name = "gap_x", nullable = false)
    private BigDecimal gapX;

    @Column(name = "gap_y", nullable = false)
    private BigDecimal gapY;

    private int sortOrder;

    protected LabelFormat() {
        // for JPA
    }

    public LabelFormat(Layout layout, int sortOrder) {
        update(layout);
        this.sortOrder = sortOrder;
    }

    /** All sizes in mm; the ranges are checked by the request, that it fits on A4 by {@link Layout#fitsA4()}. */
    public void update(Layout layout) {
        String cleanName = Texts.checkMaxLength(Texts.emptyToNull(layout.name()), NAME_MAX, "Name");
        if (cleanName == null || !layout.fitsA4()) {
            throw new IllegalArgumentException("Label format invalid: " + layout);
        }
        this.name = cleanName;
        this.columns = layout.columns();
        this.rows = layout.rows();
        this.widthMm = layout.widthMm();
        this.heightMm = layout.heightMm();
        this.marginTop = layout.marginTop();
        this.marginLeft = layout.marginLeft();
        this.gapX = layout.gapX();
        this.gapY = layout.gapY();
    }

    public Layout getLayout() {
        return new Layout(name, columns, rows, widthMm, heightMm, marginTop, marginLeft, gapX, gapY);
    }

    public int getSortOrder() {
        return sortOrder;
    }

    /** A sheet: columns × rows labels of width × height mm, from the margins on, with gaps between. */
    public record Layout(String name, int columns, int rows, BigDecimal widthMm, BigDecimal heightMm, BigDecimal marginTop,
                         BigDecimal marginLeft, BigDecimal gapX, BigDecimal gapY) {

        public Layout {
            Objects.requireNonNull(widthMm, "widthMm");
            Objects.requireNonNull(heightMm, "heightMm");
            Objects.requireNonNull(marginTop, "marginTop");
            Objects.requireNonNull(marginLeft, "marginLeft");
            Objects.requireNonNull(gapX, "gapX");
            Objects.requireNonNull(gapY, "gapY");
        }

        /** The labels end on the sheet – half a millimetre of tolerance for rounded data sheets */
        public boolean fitsA4() {
            return extent(marginLeft, columns, widthMm, gapX).compareTo(A4_WIDTH.add(new BigDecimal("0.5"))) <= 0
                    && extent(marginTop, rows, heightMm, gapY).compareTo(A4_HEIGHT.add(new BigDecimal("0.5"))) <= 0;
        }

        private static BigDecimal extent(BigDecimal margin, int count, BigDecimal size, BigDecimal gap) {
            return margin.add(size.multiply(BigDecimal.valueOf(count))).add(gap.multiply(BigDecimal.valueOf(count - 1L)));
        }
    }
}
