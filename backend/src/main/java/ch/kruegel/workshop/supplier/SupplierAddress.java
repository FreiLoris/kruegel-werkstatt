package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;

/**
 * A postal address of a supplier (FB-31) – its own, or the one for returns (e.g. a central
 * warehouse, then with a name). Texts are trimmed, empty = not set.
 *
 * @param name only for the return address: who gets it, e.g. "Zentrallager Retouren"
 */
public record SupplierAddress(String name, String street, String postalCode, String city) {

    static final int POSTAL_CODE_MAX = 10;
    static final SupplierAddress NONE = new SupplierAddress(null, null, null, null);

    public SupplierAddress {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), Supplier.NAME_MAX, "Name");
        street = Texts.checkMaxLength(Texts.emptyToNull(street), Supplier.NAME_MAX, "Street");
        postalCode = Texts.checkMaxLength(Texts.emptyToNull(postalCode), POSTAL_CODE_MAX, "Postal code");
        city = Texts.checkMaxLength(Texts.emptyToNull(city), Supplier.NAME_MAX, "City");
    }

    /** Nothing entered */
    public boolean isEmpty() {
        return name == null && street == null && postalCode == null && city == null;
    }
}
