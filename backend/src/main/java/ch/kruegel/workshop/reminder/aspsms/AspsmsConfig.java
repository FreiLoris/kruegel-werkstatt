package ch.kruegel.workshop.reminder.aspsms;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * SMS by ASPSMS (17c) – only where the workshop's access is in the environment (ASPSMS_USERKEY,
 * ASPSMS_PASSWORD; the NAS has them) and not on a test instance. Elsewhere there is no SMS sender
 * and reminders are only logged.
 */
@Configuration(proxyBeanMethods = false)
class AspsmsConfig {

    @Bean
    @Conditional(AccessSetUp.class)
    AspsmsSender aspsmsSender(@Value("${workshop.aspsms.user-key}") String userKey,
                              @Value("${workshop.aspsms.password}") String password,
                              @Value("${workshop.aspsms.originator}") String originator) {
        JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        requests.setReadTimeout(Duration.ofSeconds(20));
        return new AspsmsSender(RestClient.builder().requestFactory(requests), userKey.strip(), password.strip(), originator.strip());
    }

    /**
     * Both parts of the access given – a password may hold any character, so no expression. Never on
     * a test instance (APP_VERSION=dev): its data may be a copy of the real customers.
     */
    static class AccessSetUp implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            var environment = context.getEnvironment();
            return StringUtils.hasText(environment.getProperty("workshop.aspsms.user-key"))
                    && StringUtils.hasText(environment.getProperty("workshop.aspsms.password"))
                    && !"dev".equals(environment.getProperty("workshop.app-version"));
        }
    }
}
