package ch.kruegel.workshop.absence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Database access for absences. */
public interface AbsenceRepository extends JpaRepository<Absence, UUID> {

    /**
     * Absences touching the days [from, to] (both inclusive), by person, oldest first.
     *
     * @param employeeId only this person's; empty = everyone's
     */
    @Query("""
            SELECT a FROM Absence a
            WHERE a.period.startDate <= :to AND a.period.endDate >= :from
              AND (:employeeId IS NULL OR a.employee.id = :employeeId)
            ORDER BY a.period.startDate, a.period.startsAfternoon""")
    List<Absence> touching(LocalDate from, LocalDate to, UUID employeeId);
}
