package ch.kruegel.workshop.insurance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for insurances. */
public interface InsuranceRepository extends JpaRepository<Insurance, UUID> {

    /** All, also the ones no longer used – old tasks still name them. */
    @Query("select i from Insurance i order by lower(i.name), i.id")
    List<Insurance> findAllByName();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
