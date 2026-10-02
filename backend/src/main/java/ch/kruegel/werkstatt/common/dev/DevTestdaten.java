package ch.kruegel.werkstatt.common.dev;

import ch.kruegel.werkstatt.mitarbeiter.Mitarbeiter;
import ch.kruegel.werkstatt.mitarbeiter.MitarbeiterRepository;
import ch.kruegel.werkstatt.mitarbeiter.MitarbeiterStammdaten;
import ch.kruegel.werkstatt.mitarbeiter.Rolle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Testdaten für die lokale Entwicklung – NUR im Spring-Profil "dev"
 * (automatisch bei {@code ./mvnw spring-boot:run}, nie im Docker-Image, nie in Tests).
 *
 * <p>Bewusst Java statt Flyway-Migration: Die Flyway-Historie soll nur das echte Schema
 * enthalten. Sonst verweigert eine Installation ohne Testdaten (Docker, NAS) den Start, sobald
 * sie auf eine Datenbank trifft, in der die Testdaten-Migration eingetragen ist.
 * Zudem gehen die Testdaten so durch dieselben Prüfregeln wie echte Eingaben.
 *
 * <p>Legt nur Daten an, wenn die Tabelle leer ist – eigene Änderungen bleiben erhalten.
 */
@Component
@Profile("dev")
class DevTestdaten implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevTestdaten.class);

    private final MitarbeiterRepository mitarbeiter;

    DevTestdaten(MitarbeiterRepository mitarbeiter) {
        this.mitarbeiter = mitarbeiter;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (mitarbeiter.count() > 0) {
            return;
        }
        List<MitarbeiterStammdaten> team = List.of(
                person("Reto", Rolle.GESCHAEFTSFUEHRUNG, "#f6d860", "1985-03-12", 25),
                person("Erich", Rolle.MECHANIKER, "#ff9f9f", "1978-07-24", 25),
                person("Döme", Rolle.MECHANIKER, "#9fdfaa", "1992-11-03", 20),
                person("Mora", Rolle.MECHANIKER, "#9fc8f0", "1995-05-18", 20),
                person("Noser", Rolle.LERNENDER, "#d4b0f0", "2004-09-30", 25));

        for (int i = 0; i < team.size(); i++) {
            mitarbeiter.save(new Mitarbeiter(team.get(i), i));
        }
        log.info("Dev-Testdaten angelegt: {} Mitarbeiter", team.size());
    }

    private static MitarbeiterStammdaten person(String name, Rolle rolle, String farbe, String geburtstag, int ferien) {
        return new MitarbeiterStammdaten(name, rolle, farbe, LocalDate.parse(geburtstag), ferien, true, true, true);
    }
}
