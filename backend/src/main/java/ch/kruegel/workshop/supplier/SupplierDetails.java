package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;

import java.util.Locale;

/**
 * What the workshop knows about a supplier – everything that is edited together. Texts are trimmed,
 * empty = not set.
 *
 * @param name           the company; required
 * @param webshopUrl     "shop.example.ch" becomes "https://shop.example.ch"; only http(s) – it is shown as a link
 * @param customerNumber our customer number with the supplier
 * @param delivery       delivery times or rounds, e.g. "2× täglich"
 */
public record SupplierDetails(String name, String contactPerson, String phone, String email, String webshopUrl,
                              String customerNumber, OrderChannel orderChannel, String delivery, String remark) {

    public SupplierDetails {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), Supplier.NAME_MAX, "Name");
        if (name == null) {
            throw new IllegalArgumentException("Name is required");
        }
        contactPerson = Texts.checkMaxLength(Texts.emptyToNull(contactPerson), Supplier.NAME_MAX, "Contact person");
        phone = Texts.checkMaxLength(Texts.emptyToNull(phone), Supplier.PHONE_MAX, "Phone");
        email = Texts.checkMaxLength(Texts.emptyToNull(email), Supplier.NAME_MAX, "Email");
        webshopUrl = Texts.checkMaxLength(withScheme(Texts.emptyToNull(webshopUrl)), Supplier.URL_MAX, "Webshop");
        customerNumber = Texts.checkMaxLength(Texts.emptyToNull(customerNumber), Supplier.CODE_MAX, "Customer number");
        delivery = Texts.checkMaxLength(Texts.emptyToNull(delivery), Supplier.NAME_MAX, "Delivery");
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), Supplier.REMARK_MAX, "Remark");
    }

    /** Typed without "https://" → added; any other scheme (javascript:, ftp:, …) is refused. */
    static String withScheme(String url) {
        if (url == null) {
            return null;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            return url;
        }
        if (lower.matches("^[a-z][a-z0-9+.-]*:.*") && !lower.matches("^[^/]+:\\d+.*")) {
            throw new IllegalArgumentException("Only http(s) links: '" + url + "'");
        }
        return "https://" + url;
    }
}
