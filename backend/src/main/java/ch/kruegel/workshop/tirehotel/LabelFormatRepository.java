package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Database access for the label sheet formats. */
public interface LabelFormatRepository extends JpaRepository<LabelFormat, UUID> {

    @Query("SELECT f FROM LabelFormat f ORDER BY f.sortOrder, lower(f.name)")
    List<LabelFormat> findAllInOrder();

    @Query("SELECT coalesce(max(f.sortOrder), -1) FROM LabelFormat f")
    int maxSortOrder();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
