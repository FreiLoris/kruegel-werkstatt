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
 * ASPSMS_PASSWORD; the NAS has them) and a release runs. Elsewhere there is no SMS sender and
 * reminders are only logged.
 */
@Configuration(proxyBeanMethods = false)
class AspsmsConfig {

    @Bean
    @Conditional(AccessSetUp.class)
    AspsmsSender aspsmsSender(@Value("${workshop.aspsms.user-key}") String userKey,
                              @Value("${workshop.aspsms.password}") String password) {
        JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        requests.setReadTimeout(Duration.ofSeconds(20));
        // spaces around a value in .env are typing slips, never part of the key
        return new AspsmsSender(RestClient.builder().requestFactory(requests), userKey.strip(), password.strip());
    }

    /**
     * Both parts of the access given (a password may hold any character, so no expression) – and a
     * release runs: APP_VERSION set and not "dev". A test instance, a developer's run without a version:
     * never, their data may be a copy of the real customers.
     */
    static class AccessSetUp implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            var environment = context.getEnvironment();
            return StringUtils.hasText(environment.getProperty("workshop.aspsms.user-key"))
                    && StringUtils.hasText(environment.getProperty("workshop.aspsms.password"))
                    && isRelease(environment.getProperty("workshop.app-version"));
        }

        private static boolean isRelease(String appVersion) {
            return StringUtils.hasText(appVersion) && !appVersion.strip().equalsIgnoreCase("dev");
        }
    }
}
