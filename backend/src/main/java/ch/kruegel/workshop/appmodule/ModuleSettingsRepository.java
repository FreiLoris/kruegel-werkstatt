package ch.kruegel.workshop.appmodule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface ModuleSettingsRepository extends JpaRepository<ModuleSettings, UUID> {

    /** The only row – V62 creates it */
    default ModuleSettings theSettings() {
        return findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Module settings missing – migration V62 creates them"));
    }
}
