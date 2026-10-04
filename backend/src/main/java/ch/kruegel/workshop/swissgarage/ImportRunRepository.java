package ch.kruegel.workshop.swissgarage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Database access for the import log. */
public interface ImportRunRepository extends JpaRepository<ImportRun, UUID> {

    /** The last 20 imports, newest first – enough for "zuletzt importiert am …". */
    List<ImportRun> findTop20ByOrderByCreatedAtDesc();
}
