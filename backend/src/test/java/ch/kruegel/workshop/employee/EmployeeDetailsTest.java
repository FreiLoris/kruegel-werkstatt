package ch.kruegel.workshop.employee;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit test – no Spring, no database, therefore very fast. */
class EmployeeDetailsTest {

    private static EmployeeDetails with(String name, String color, int vacationDays) {
        return new EmployeeDetails(name, Role.MECHANIC, color, null, vacationDays, true, true, true);
    }

    @Test
    void cleansUpNameAndColor() {
        EmployeeDetails details = with("  Döme ", " #9FDFAA ", 20);

        assertThat(details.name()).isEqualTo("Döme");
        assertThat(details.color()).isEqualTo("#9fdfaa");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "Ein sehr langer Name mit mehr als vierzig Zeichen"})
    void rejectsInvalidName(String name) {
        assertThatThrownBy(() -> with(name, "#9fdfaa", 20)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"rot", "#fff", "#12345g", "9fdfaa"})
    void rejectsInvalidColor(String color) {
        assertThatThrownBy(() -> with("Reto", color, 20)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 61})
    void rejectsImplausibleVacationDays(int days) {
        assertThatThrownBy(() -> with("Reto", "#9fdfaa", days)).isInstanceOf(IllegalArgumentException.class);
    }
}
