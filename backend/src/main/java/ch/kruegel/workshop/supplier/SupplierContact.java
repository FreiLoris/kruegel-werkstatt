package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;
import jakarta.persistence.Embeddable;

/**
 * A contact at a supplier (FB-30) – a department or a person, with direct line, mobile and e-mail.
 * Texts are trimmed, empty = not set; at least one of department, name, phone, mobile, e-mail.
 */
@Embeddable
public record SupplierContact(String department, String name, String phone, String mobile, String email, String remark) {

    static final int REMARK_MAX = 300;

    public SupplierContact {
        department = Texts.checkMaxLength(Texts.emptyToNull(department), Supplier.NAME_MAX, "Department");
        name = Texts.checkMaxLength(Texts.emptyToNull(name), Supplier.NAME_MAX, "Name");
        phone = Texts.checkMaxLength(Texts.emptyToNull(phone), Supplier.PHONE_MAX, "Phone");
        mobile = Texts.checkMaxLength(Texts.emptyToNull(mobile), Supplier.PHONE_MAX, "Mobile");
        email = Texts.checkMaxLength(Texts.emptyToNull(email), Supplier.NAME_MAX, "Email");
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), REMARK_MAX, "Remark");
        if (department == null && name == null && phone == null && mobile == null && email == null) {
            throw new IllegalArgumentException("A contact needs a department, a name, a phone or an e-mail");
        }
    }
}
