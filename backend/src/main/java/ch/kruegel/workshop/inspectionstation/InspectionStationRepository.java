package ch.kruegel.workshop.inspectionstation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Database access for inspection stations. */
public interface InspectionStationRepository extends JpaRepository<InspectionStation, UUID> {

    /** All, the standard first, then by name – also the ones no longer used: old tasks still name them. */
    @Query("select s from InspectionStation s order by s.standard desc, lower(s.name), s.id")
    List<InspectionStation> findAllStandardFirst();

    /** The station preset on a new task (the migration creates one, the service keeps exactly one). */
    @Query("select s from InspectionStation s where s.standard = true")
    Optional<InspectionStation> findStandard();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
