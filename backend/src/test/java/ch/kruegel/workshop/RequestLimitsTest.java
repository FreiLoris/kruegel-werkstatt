package ch.kruegel.workshop;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.util.ClassUtils;

import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Every text a request accepts has a length limit at the request – then a too long text is a 400 at the
 * field. Without it, the length check in the entity ({@code Texts.checkMaxLength}) would answer with a 500.
 * The limits themselves are the entities' constants ({@code @Size(max = Supplier.NAME_MAX)}), so request
 * and entity cannot drift apart.
 */
class RequestLimitsTest {

    @Test
    void everyTextOfARequestHasALengthLimit() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false) {
            @Override
            protected boolean isCandidateComponent(org.springframework.beans.factory.annotation.AnnotatedBeanDefinition definition) {
                return true;
            }
        };
        scanner.addIncludeFilter(new RegexPatternTypeFilter(java.util.regex.Pattern.compile(".*Request(\\$.*)?")));

        List<String> unbounded = new ArrayList<>();
        int checked = 0;
        for (var definition : scanner.findCandidateComponents("ch.kruegel.workshop")) {
            Class<?> type = ClassUtils.forName(definition.getBeanClassName(), getClass().getClassLoader());
            if (!type.isRecord()) {
                continue;
            }
            for (RecordComponent component : type.getRecordComponents()) {
                if (component.getType() == String.class) {
                    checked++;
                    var field = component.getAccessor();
                    boolean bounded = component.isAnnotationPresent(Size.class) || component.isAnnotationPresent(Pattern.class)
                            || field.isAnnotationPresent(Size.class) || field.isAnnotationPresent(Pattern.class);
                    if (!bounded) {
                        unbounded.add(type.getSimpleName() + "." + component.getName());
                    }
                }
            }
        }

        assertThat(checked).as("texts of requests found").isGreaterThan(50);
        assertThat(unbounded).as("texts without @Size or @Pattern").isEmpty();
    }
}
