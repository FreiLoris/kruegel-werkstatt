package ch.kruegel.workshop.customer;

/** Helpers to create test data – fictitious people only. */
public final class CustomerTestData {

    private CustomerTestData() {
    }

    public static CustomerDetails person(String lastName, String firstName) {
        return new CustomerDetails("Herr", firstName, lastName, null, null, "Musterstrasse 1", "8400", "Winterthur",
                "052 000 00 00", null, null);
    }

    public static Customer local(String lastName) {
        return Customer.local(person(lastName, "Test"));
    }

    public static Customer swissGarage(String addressNumber, String lastName) {
        return Customer.fromSwissGarage(addressNumber, person(lastName, "Test"));
    }
}
