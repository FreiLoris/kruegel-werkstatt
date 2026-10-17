package ch.kruegel.workshop.employee;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** Database access for the entitlements of past years. */
public interface VacationEntitlementRepository extends JpaRepository<VacationEntitlement, UUID> {

    List<VacationEntitlement> findByYear(int year);

    List<VacationEntitlement> findByEmployeeId(UUID employeeId);
}
