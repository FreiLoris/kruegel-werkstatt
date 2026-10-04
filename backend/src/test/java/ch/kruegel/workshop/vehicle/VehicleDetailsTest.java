package ch.kruegel.workshop.vehicle;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VehicleDetailsTest {

    private static VehicleDetails with(String plate, String make, String model, Integer year, Integer km) {
        return new VehicleDetails(plate, make, model, null, null, year, km, null, null, null);
    }

    @Test
    void normalizesPlateAndDescribesMakeAndModel() {
        VehicleDetails d = with(" zh 12345 ", "VW", "Golf", 2019, 85000);

        assertThat(d.licensePlate()).isEqualTo("ZH 12345");
        assertThat(d.description()).isEqualTo("VW Golf");
    }

    @Test
    void makeOrModelIsEnough() {
        assertThat(with(null, "VW", null, null, null).description()).isEqualTo("VW");
        assertThat(with(null, null, "Golf", null, null).description()).isEqualTo("Golf");
    }

    @Test
    void needsMakeOrModel() {
        assertThatThrownBy(() -> with("ZH 1", " ", null, null, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsImplausibleYearAndMileage() {
        assertThatThrownBy(() -> with(null, "VW", null, 1850, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> with(null, "VW", null, null, -1)).isInstanceOf(IllegalArgumentException.class);
    }
}
