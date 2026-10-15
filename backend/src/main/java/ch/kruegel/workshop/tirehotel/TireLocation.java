package ch.kruegel.workshop.tirehotel;

import ch.kruegel.workshop.common.Texts;
import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * A location of the tyre hotel (FB-07), e.g. the floor grid of the upper floor or the shelves of the
 * container. Its places are generated from its sizes ({@link TirePlace}) – nobody enters them one by one.
 *
 * <p>The sizes mean, by {@link TireLocationKind}: FLOOR – columns (A, B, …), rows, sets per field;
 * SHELVES – shelves, levels, compartments.
 */
@Entity
public class TireLocation extends BaseEntity {

    static final Pattern CODE = Pattern.compile("[A-Z0-9]{1,6}");
    static final int NAME_MAX = 60;
    static final int MAX_A = 26;
    static final int MAX_B = 30;
    static final int MAX_C = 30;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TireLocationKind kind;

    // explicit: the naming strategy would make "sizea" of "sizeA"
    @Column(name = "size_a")
    private int sizeA;
    @Column(name = "size_b")
    private int sizeB;
    @Column(name = "size_c")
    private int sizeC;
    private int sortOrder;

    protected TireLocation() {
        // for JPA
    }

    public TireLocation(String code, String name, TireLocationKind kind, int sizeA, int sizeB, int sizeC, int sortOrder) {
        this.kind = Objects.requireNonNull(kind, "kind");
        this.sortOrder = sortOrder;
        update(code, name, sizeA, sizeB, sizeC);
    }

    /** New code, name or sizes – the kind stays (its places would mean something else). */
    public void update(String code, String name, int sizeA, int sizeB, int sizeC) {
        String cleanCode = code == null ? "" : code.strip().toUpperCase();
        if (!CODE.matcher(cleanCode).matches()) {
            throw new IllegalArgumentException("Code: 1–6 letters or digits, was " + code);
        }
        String cleanName = Texts.checkMaxLength(Texts.emptyToNull(name), NAME_MAX, "Name");
        if (cleanName == null) {
            throw new IllegalArgumentException("Name is required");
        }
        if (sizeA < 1 || sizeA > MAX_A || sizeB < 1 || sizeB > MAX_B || sizeC < 1 || sizeC > MAX_C) {
            throw new IllegalArgumentException("Sizes out of range: %d/%d/%d".formatted(sizeA, sizeB, sizeC));
        }
        this.code = cleanCode;
        this.name = cleanName;
        this.sizeA = sizeA;
        this.sizeB = sizeB;
        this.sizeC = sizeC;
    }

    /** Whether a place lies within the sizes */
    public boolean contains(int a, int b, int c) {
        return a <= sizeA && b <= sizeB && c <= sizeC;
    }

    /** "OG-B3-1" (floor: column letter, row, set on the trolley) or "CT-R1-E2-F4" (shelf, level, compartment) */
    public String address(int a, int b, int c) {
        return switch (kind) {
            case FLOOR -> "%s-%c%d-%d".formatted(code, (char) ('A' + a - 1), b, c);
            case SHELVES -> "%s-R%d-E%d-F%d".formatted(code, a, b, c);
        };
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public TireLocationKind getKind() {
        return kind;
    }

    public int getSizeA() {
        return sizeA;
    }

    public int getSizeB() {
        return sizeB;
    }

    public int getSizeC() {
        return sizeC;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
