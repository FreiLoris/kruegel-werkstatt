package ch.kruegel.workshop.publicholiday;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What V61 ticks for every installation – Krügel's must stay exactly the days the app had before neutral 2.
 * Read from the migration itself: the API tests start from TestDatabase's copy of it.
 */
class V61SeedTest {

    private static final Pattern SEEDED = Pattern.compile("unnest\\(ARRAY\\[(.*?)]\\)", Pattern.DOTALL);
    private static final Pattern NAME = Pattern.compile("'([A-Z_]+)'");

    @Test
    void theCantonOfZurichsTwelveDays() throws IOException {
        String sql;
        try (InputStream in = getClass().getResourceAsStream("/db/migration/V61__public_holiday_settings.sql")) {
            assertThat(in).isNotNull();
            sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        Matcher seeded = SEEDED.matcher(sql);
        assertThat(seeded.find()).isTrue();

        Set<HolidayRule> rules = EnumSet.noneOf(HolidayRule.class);
        Matcher name = NAME.matcher(seeded.group(1));
        while (name.find()) {
            rules.add(HolidayRule.valueOf(name.group(1)));
        }
        assertThat(rules).isEqualTo(PublicHolidaysTest.ZURICH);
    }
}
