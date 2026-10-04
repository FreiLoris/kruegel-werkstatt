package ch.kruegel.workshop.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Database access for tasks. Queries for the views follow with the API (6b) and the views (6f/6g). */
public interface TaskRepository extends JpaRepository<Task, UUID> {
}
