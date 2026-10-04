package ch.kruegel.workshop.common.config;

import ch.kruegel.workshop.common.person.PersonInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Spring MVC settings: person check for all API calls. */
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
