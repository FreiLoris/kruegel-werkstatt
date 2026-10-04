package ch.kruegel.workshop.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Database access for the (only) company profile. */
public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, UUID> {
}
