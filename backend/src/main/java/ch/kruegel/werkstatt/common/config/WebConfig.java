package ch.kruegel.werkstatt.common.config;

import ch.kruegel.werkstatt.common.person.PersonInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Spring-MVC-Einstellungen: Personenprüfung für alle API-Aufrufe. */
@Configuration(proxyBeanMethods = false)
public class WebConfig implements WebMvcConfigurer {

    private final PersonInterceptor personInterceptor;

    WebConfig(PersonInterceptor personInterceptor) {
        this.personInterceptor = personInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(personInterceptor).addPathPatterns("/api/**");
    }
}
