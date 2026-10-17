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
    static final int STREET_MAX = 100;
    static final int POSTAL_CODE_MAX = 10;
    static final int CITY_MAX = 60;
    static final int PHONE_MAX = 30;
    static final int EMAIL_MAX = 100;
    static final int WEBSITE_MAX = 100;

    public CompanyDetails {
        name = Texts.checkMaxLength(Texts.emptyToNull(name), NAME_MAX, "Name");
        if (name == null) {
            throw new IllegalArgumentException("The company needs a name");
        }
        street = Texts.checkMaxLength(Texts.emptyToNull(street), STREET_MAX, "Street");
        postalCode = Texts.checkMaxLength(Texts.emptyToNull(postalCode), POSTAL_CODE_MAX, "Postal code");
        city = Texts.checkMaxLength(Texts.emptyToNull(city), CITY_MAX, "City");
        phone = Texts.checkMaxLength(Texts.emptyToNull(phone), PHONE_MAX, "Phone");
        email = Texts.checkMaxLength(Texts.emptyToNull(email), EMAIL_MAX, "E-mail");
        website = Texts.checkMaxLength(Texts.emptyToNull(website), WEBSITE_MAX, "Website");
    }
}
