package ch.kruegel.workshop.publicholiday;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** Which public holidays the workshop has (neutral 2) – exactly one row (V61, the canton of Zurich's days). */
@Entity
public class PublicHolidaySettings extends BaseEntity {

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "public_holiday_settings_rule", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "rule", nullable = false)
    @Enumerated(EnumType.STRING)
    private Set<HolidayRule> rules = EnumSet.noneOf(HolidayRule.class);

    protected PublicHolidaySettings() {
        // for JPA
    }

    /** None at all is allowed – a workshop that works every weekday */
    public void update(Set<HolidayRule> rules) {
        Objects.requireNonNull(rules, "rules");
        this.rules.clear();
        this.rules.addAll(rules);
    }

    public Set<HolidayRule> getRules() {
        return rules.isEmpty() ? EnumSet.noneOf(HolidayRule.class) : EnumSet.copyOf(rules);
    }
}
