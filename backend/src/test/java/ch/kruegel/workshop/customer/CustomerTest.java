package ch.kruegel.workshop.customer;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit tests for the customer rules – no Spring, no database. */
class CustomerTest {

    private static CustomerDetails details(String firstName, String lastName, String company) {
        return new CustomerDetails(null, firstName, lastName, company, null, null, null, null, null, null, null);
    }

    @Test
    void displayNameLastNameFirst() {
        assertThat(details("Peter", "Huber", null).displayName()).isEqualTo("Huber Peter");
        assertThat(details(null, "Huber", null).displayName()).isEqualTo("Huber");
    }

    @Test
    void displayNameOfCompanies() {
        assertThat(details(null, null, "Muster AG").displayName()).isEqualTo("Muster AG");
        assertThat(details("Peter", "Huber", "Muster AG").displayName()).isEqualTo("Muster AG (Huber Peter)");
    }

    @Test
    void needsLastNameOrCompany() {
        assertThatThrownBy(() -> details("Peter", "  ", null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void emptyTextsBecomeNull() {
        CustomerDetails d = new CustomerDetails(" ", " Peter ", "Huber", "", null, null, null, null, "  ", null, null);
        assertThat(d.salutation()).isNull();
        assertThat(d.firstName()).isEqualTo("Peter");
        assertThat(d.phone()).isNull();
    }

    @Test
    void swissGarageCustomerCannotBeChangedLikeALocalOne() {
        Customer fromSwissGarage = CustomerTestData.swissGarage("1001", "Huber");
        Customer local = CustomerTestData.local("Meier");

        assertThatThrownBy(() -> fromSwissGarage.update(details("X", "Y", null))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> local.updateFromSwissGarage(details("X", "Y", null))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void importReactivatesAMissingCustomer() {
        Customer customer = CustomerTestData.swissGarage("1001", "Huber");
        customer.deactivate();

        customer.updateFromSwissGarage(details("Peter", "Huber", null));

        assertThat(customer.isActive()).isTrue();
    }
}
