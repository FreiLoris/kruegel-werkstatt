package ch.kruegel.workshop.dataimport;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImportFieldTest {

    @Test
    void suggests_whateverTheWriting() {
        assertThat(ImportField.suggest("Nachname")).contains(ImportField.LAST_NAME);
        assertThat(ImportField.suggest(" NAME ")).contains(ImportField.LAST_NAME);
        assertThat(ImportField.suggest("Tel. 1")).contains(ImportField.PHONE);
        assertThat(ImportField.suggest("Straße")).contains(ImportField.STREET);
        assertThat(ImportField.suggest("Hausnummer")).contains(ImportField.STREET);
        assertThat(ImportField.suggest("PLZ/Ort")).contains(ImportField.POSTAL_CODE_CITY);
        assertThat(ImportField.suggest("E-Mail")).contains(ImportField.EMAIL);
        assertThat(ImportField.suggest("Kennzeichen")).contains(ImportField.LICENSE_PLATE);
        assertThat(ImportField.suggest("1. Inv.")).contains(ImportField.FIRST_REGISTRATION);
        assertThat(ImportField.suggest("Km-Stand")).contains(ImportField.MILEAGE);
        assertThat(ImportField.suggest("Letzte Prüfung")).contains(ImportField.LAST_MFK);
    }

    @Test
    void unknownHeader_noSuggestion() {
        assertThat(ImportField.suggest("Rabatt")).isEmpty();
        assertThat(ImportField.suggest("")).isEmpty();
    }

    @Test
    void onlyTextMayComeFromSeveralColumns() {
        assertThat(ImportField.STREET.joinable()).isTrue();
        assertThat(ImportField.FIRST_REGISTRATION.joinable()).isFalse();
        assertThat(ImportField.MILEAGE.joinable()).isFalse();
    }
}
