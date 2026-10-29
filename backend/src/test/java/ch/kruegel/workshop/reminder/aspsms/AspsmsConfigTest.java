package ch.kruegel.workshop.reminder.aspsms;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class AspsmsConfigTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(AspsmsConfig.class)
            .withPropertyValues("workshop.aspsms.originator=Kruegel");

    @Test
    void sendsWithTheAccess() {
        context.withPropertyValues("workshop.aspsms.user-key=KEY", "workshop.aspsms.password=p'w\"x", "workshop.app-version=latest")
                .run(c -> assertThat(c).hasSingleBean(AspsmsSender.class));
    }

    @Test
    void notWithoutIt() {
        context.withPropertyValues("workshop.aspsms.user-key=KEY", "workshop.aspsms.password= ")
                .run(c -> assertThat(c).doesNotHaveBean(AspsmsSender.class));
    }

    @Test
    void neverOnATestInstance() {
        context.withPropertyValues("workshop.aspsms.user-key=KEY", "workshop.aspsms.password=pw", "workshop.app-version=dev")
                .run(c -> assertThat(c).doesNotHaveBean(AspsmsSender.class));
    }
}
