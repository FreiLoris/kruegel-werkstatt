package ch.kruegel.werkstatt.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Kopfdaten der API-Beschreibung (OpenAPI).
 *
 * <p>Die eigentliche Beschreibung der Endpoints erzeugt springdoc automatisch aus den
 * Controllern und DTOs. Sie ist der <b>Vertrag</b> zwischen Backend und Frontend:
 * Daraus werden die TypeScript-Typen des Frontends generiert.
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    @Bean
    OpenAPI werkstattOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Krügel Werkstatt API")
                        .version("v1"))
                // Feste, relative Server-Adresse: Die Beschreibung ist so immer identisch,
                // egal auf welchem Rechner/Port sie erzeugt wird.
                .servers(List.of(new Server().url("/")));
    }

    /**
     * Ausgaben ({@code …Dto}) enthalten IMMER alle Felder – Felder ohne Wert kommen als
     * {@code null}, fehlen aber nie. Darum sind im Vertrag alle Felder Pflicht.
     *
     * <p>Ohne diese Regel wäre in TypeScript jedes Feld optional ({@code name?: string}) und
     * das Frontend müsste überall mit "vielleicht fehlt es" rechnen.
     */
    @Bean
    OpenApiCustomizer dtoFelderSindPflicht() {
        return openApi -> openApi.getComponents().getSchemas().forEach((name, schema) -> {
            if (name.endsWith("Dto") && schema.getProperties() != null) {
                schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
            }
        });
    }
}
