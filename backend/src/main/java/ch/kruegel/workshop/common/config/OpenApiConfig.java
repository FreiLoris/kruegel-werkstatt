package ch.kruegel.workshop.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Header data of the API description (OpenAPI).
 *
 * <p>springdoc generates the actual description of the endpoints from the controllers and
 * DTOs. It is the <b>contract</b> between backend and frontend: the frontend's TypeScript
 * types are generated from it.
 */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    @Bean
    OpenAPI workshopOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Krügel Werkstatt API")
                        .version("v1"))
                // Fixed, relative server address: the description is always identical,
                // no matter on which machine/port it is generated.
                .servers(List.of(new Server().url("/")));
    }

    /**
     * Responses ({@code …Dto}) ALWAYS contain every field – fields without a value come as
     * {@code null} but are never missing. That is why all fields are required in the contract.
     *
     * <p>Without this rule every field would be optional in TypeScript ({@code name?: string})
     * and the frontend would have to handle "maybe missing" everywhere.
     */
    @Bean
    OpenApiCustomizer dtoFieldsAreRequired() {
        return openApi -> openApi.getComponents().getSchemas().forEach((name, schema) -> {
            if (name.endsWith("Dto") && schema.getProperties() != null) {
                schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
            }
        });
    }

    /**
     * A DTO field that refers to another DTO and may be empty
     * ({@code @Schema(types = {"object", "null"})}) becomes {@code oneOf: [reference, null]}.
     *
     * <p>springdoc writes the "null" next to the {@code $ref}, where it is ignored – TypeScript
     * would then claim the field is never null.
     */
    @Bean
    OpenApiCustomizer nullableReferences() {
        return openApi -> openApi.getComponents().getSchemas().values().forEach(OpenApiConfig::nullableReferences);
    }

    @SuppressWarnings({"rawtypes", "unchecked"}) // the swagger model only has raw Map<String, Schema>
    private static void nullableReferences(Schema schema) {
        Map<String, Schema> properties = schema.getProperties();
        if (properties == null) {
            return;
        }
        properties.replaceAll((field, property) ->
                property.get$ref() != null && property.getTypes() != null && property.getTypes().contains("null")
                        ? new Schema<>()
                                .oneOf(List.of(new Schema<>().$ref(property.get$ref()), new Schema<>().types(Set.of("null"))))
                                .description(property.getDescription())
                        : property);
    }
}
