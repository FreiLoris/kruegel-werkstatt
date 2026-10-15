package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.swissgarage.TireHotelImportService.Tyres;
import ch.kruegel.workshop.tirehotel.Season;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** How the free texts of the SwissGarage tyre hotel are read – the shapes of the real export, fictitious brands. */
class TireHotelImportServiceTest {

    @Test
    void theDimensionWhereverItStandsTheRestIsBrandAndModel() {
        assertThat(TireHotelImportService.tyres("Muster Alpin 6 205/55R16 91H")).isEqualTo(new Tyres("Muster", "Alpin 6", "205/55R16 91H"));
        assertThat(TireHotelImportService.tyres("205/55R16 91H Muster Alpin 6")).isEqualTo(new Tyres("Muster", "Alpin 6", "205/55R16 91H"));
        assertThat(TireHotelImportService.tyres("225/45 zr17 94w")).isEqualTo(new Tyres(null, null, "225/45 ZR17 94W"));
        // speed index right after the rim, without load index
        assertThat(TireHotelImportService.tyres("Beispiel Eco Plus 195/65R15V")).isEqualTo(new Tyres("Beispiel", "Eco Plus", "195/65R15V"));
        // no dimension at all
        assertThat(TireHotelImportService.tyres("Muster Winter")).isEqualTo(new Tyres("Muster", "Winter", null));
        assertThat(TireHotelImportService.tyres("  ")).isEqualTo(new Tyres(null, null, null));
    }

    @Test
    void theSeasonFromTheKind() {
        assertThat(TireHotelImportService.season("Sommer-Alufelgen")).isEqualTo(Season.SUMMER);
        assertThat(TireHotelImportService.season("Winter-")).isEqualTo(Season.WINTER);
        assertThat(TireHotelImportService.season("Ganzjahres-Stahlfelgen")).isEqualTo(Season.ALL_SEASON);
        assertThat(TireHotelImportService.season("Felgen")).isNull();
    }

    @Test
    void namesWhateverTheOrderOfTheWords() {
        assertThat(TireHotelImportService.nameKey("Huber  Peter")).isEqualTo(TireHotelImportService.nameKey("Peter Huber"));
        assertThat(TireHotelImportService.nameKey("Muster AG (Huber Peter)")).isEqualTo("ag huber muster peter");
    }
}
