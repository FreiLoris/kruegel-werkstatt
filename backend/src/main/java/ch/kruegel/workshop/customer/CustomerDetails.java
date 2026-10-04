package ch.kruegel.workshop.customer;

import ch.kruegel.workshop.common.Texts;

/**
 * All details of a customer – the same for local input and the SwissGarage import.
 *
 * <p>Lenient on purpose: data from SwissGarage is taken as it is (only whitespace cleaned up,
 * empty → {@code null}). Strict format checks for local input (e.g. e-mail) are done by
 * {@link CustomerRequest}. The only hard rule: a customer needs a name – a last name or a company.
 */
public record CustomerDetails(
        String salutation,
        String firstName,
        String lastName,
        String company,
        String addition,
        String street,
        String postalCode,
        String city,
        String phone,
        String mobile,
        String email) {

    static final int MAX = 100;

    public CustomerDetails {
        salutation = clean(salutation, "Salutation");
        firstName = clean(firstName, "First name");
        lastName = clean(lastName, "Last name");
        company = clean(company, "Company");
        addition = clean(addition, "Addition");
        street = clean(street, "Street");
        postalCode = clean(postalCode, "Postal code");
        city = clean(city, "City");
        phone = clean(phone, "Phone");
        mobile = clean(mobile, "Mobile");
        email = clean(email, "E-mail");

        if (lastName == null && company == null) {
            throw new IllegalArgumentException("A customer needs a last name or a company");
        }
    }

    /**
     * How the customer is shown in lists: "Muster AG" / "Huber Peter" / "Muster AG (Huber Peter)".
     * Last name first, as in SwissGarage and the old app.
     */
    public String displayName() {
        String person = lastName == null ? null : (firstName == null ? lastName : lastName + " " + firstName);
        if (company == null) {
            return person;
        }
        return person == null ? company : company + " (" + person + ")";
    }

    private static String clean(String value, String field) {
        return Texts.checkMaxLength(Texts.emptyToNull(value), MAX, field);
    }
}
