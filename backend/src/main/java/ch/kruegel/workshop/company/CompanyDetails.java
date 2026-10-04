package ch.kruegel.workshop.company;

import ch.kruegel.workshop.common.Texts;

/**
 * Name and contact data of the workshop. Everything except the name is optional –
 * empty lines are simply left out on the letterhead.
 */
public record CompanyDetails(
        String name,
        String street,
        String postalCode,
        String city,
        String phone,
        String email,
        String website) {

    static final int NAME_MAX = 60;

    public CompanyDetails {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), NAME_MAX, "Name");
        if (name == null) {
            throw new IllegalArgumentException("The company needs a name");
        }
        street = Texts.checkMaxLength(Texts.emptyToNull(street), 100, "Street");
        postalCode = Texts.checkMaxLength(Texts.emptyToNull(postalCode), 10, "Postal code");
        city = Texts.checkMaxLength(Texts.emptyToNull(city), 60, "City");
        phone = Texts.checkMaxLength(Texts.emptyToNull(phone), 30, "Phone");
        email = Texts.checkMaxLength(Texts.emptyToNull(email), 100, "E-mail");
        website = Texts.checkMaxLength(Texts.emptyToNull(website), 100, "Website");
    }
}
