package ch.kruegel.workshop.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for suppliers. */
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    @Query("select s from Supplier s order by lower(s.name), s.id")
    List<Supplier> findAllByName();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
