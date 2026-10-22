package ch.kruegel.workshop.tirehotel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The acknowledgements of a season (FB-21). */
public interface TireSeasonAckRepository extends JpaRepository<TireSeasonAck, UUID> {

    List<TireSeasonAck> findByDeadline(LocalDate deadline);

    boolean existsByTireSetIdAndDeadline(UUID tireSetId, LocalDate deadline);

    /** The deadline was changed in the settings – its acknowledgements go along */
    @Modifying
    @Query("UPDATE TireSeasonAck a SET a.deadline = :to WHERE a.deadline = :from")
    void moveDeadline(LocalDate from, LocalDate to);
}
