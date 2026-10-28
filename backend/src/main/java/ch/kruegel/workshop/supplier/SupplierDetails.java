package ch.kruegel.workshop.supplier;

import ch.kruegel.workshop.common.Texts;

import java.util.List;
import java.util.Locale;

/**
 * What the workshop knows about a supplier – everything that is edited together. Texts are trimmed,
 * empty = not set.
 *
 * @param name           the company; required
 * @param webshopUrl     "shop.example.ch" becomes "https://shop.example.ch"; only http(s) – it is shown as a link
 * @param customerNumber our customer number with the supplier
 * @param delivery       delivery times or rounds as free text, e.g. "2× täglich" – a remark since the deliveries (FB-30)
 * @param contacts       departments and people; phone and e-mail are the main line
 * @param deliveries     ways it delivers, with order deadline, tour and arrival
 * @param address        its postal address (FB-31)
 * @param returnAddress  where returns go when not to {@code address}, e.g. a central warehouse
 */
public record SupplierDetails(String name, String phone, String email, String webshopUrl, String customerNumber,
                              OrderChannel orderChannel, String delivery, String remark, List<SupplierContact> contacts,
                              List<SupplierDelivery> deliveries, SupplierAddress address, SupplierAddress returnAddress) {

    public SupplierDetails {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), Supplier.NAME_MAX, "Name");
        if (name == null) {
            throw new IllegalArgumentException("Name is required");
        }
        phone = Texts.checkMaxLength(Texts.emptyToNull(phone), Supplier.PHONE_MAX, "Phone");
        email = Texts.checkMaxLength(Texts.emptyToNull(email), Supplier.NAME_MAX, "Email");
        webshopUrl = Texts.checkMaxLength(withScheme(Texts.emptyToNull(webshopUrl)), Supplier.URL_MAX, "Webshop");
        customerNumber = Texts.checkMaxLength(Texts.emptyToNull(customerNumber), Supplier.CODE_MAX, "Customer number");
        delivery = Texts.checkMaxLength(Texts.emptyToNull(delivery), Supplier.NAME_MAX, "Delivery");
        remark = Texts.checkMaxLength(Texts.emptyToNull(remark), Supplier.REMARK_MAX, "Remark");
        contacts = contacts == null ? List.of() : List.copyOf(contacts);
        deliveries = deliveries == null ? List.of() : List.copyOf(deliveries);
        // its own address has no name of its own – the supplier's
        address = address == null ? SupplierAddress.NONE : new SupplierAddress(null, address.street(), address.postalCode(), address.city());
        returnAddress = returnAddress == null ? SupplierAddress.NONE : returnAddress;
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
