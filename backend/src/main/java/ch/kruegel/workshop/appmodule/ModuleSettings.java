package ch.kruegel.workshop.appmodule;

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

/**
 * Which parts of the app the workshop switched off (neutral 3) – exactly one row (V62). The ones OFF
 * are stored: a module added later is on everywhere, as it was in the app before.
 */
@Entity
public class ModuleSettings extends BaseEntity {

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "module_settings_off", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "module", nullable = false)
    @Enumerated(EnumType.STRING)
    private Set<AppModule> off = EnumSet.noneOf(AppModule.class);

    protected ModuleSettings() {
        // for JPA
    }

    public void update(Set<AppModule> off) {
        Objects.requireNonNull(off, "off");
        this.off.clear();
        this.off.addAll(off);
    }

    public boolean isOn(AppModule module) {
        return !off.contains(module);
    }
}
