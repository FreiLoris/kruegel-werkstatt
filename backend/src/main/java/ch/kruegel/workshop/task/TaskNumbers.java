package ch.kruegel.workshop.task;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Assigns task numbers (12d): year and a running number, "26-0001". The counter row of the year
 * is locked until the calling transaction ends – two devices never get the same number, and a
 * save that fails gives its number back (no gaps).
 */
@Component
class TaskNumbers {

    private final JdbcClient jdbc;
    private final TaskRepository tasks;
    private final Clock clock;

    TaskNumbers(JdbcClient jdbc, TaskRepository tasks, Clock clock) {
        this.jdbc = jdbc;
        this.tasks = tasks;
        this.clock = clock;
    }

    /** The next free number of the current year. Must be called inside the transaction that saves the task. */
    String next() {
        int year = LocalDate.now(clock).getYear();
        while (true) {
            int running = jdbc.sql("""
                            INSERT INTO task_number_counter (year, last_number) VALUES (:year, 1)
                            ON CONFLICT (year) DO UPDATE SET last_number = task_number_counter.last_number + 1
                            RETURNING last_number""")
                    .param("year", year)
                    .query(Integer.class)
                    .single();
            String number = format(year, running);
            // a number typed by hand earlier may look like one of ours – skip it
            if (!tasks.existsByTaskNumber(number)) {
                return number;
            }
        }
    }

    static String format(int year, int running) {
        return "%02d-%04d".formatted(year % 100, running);
    }
}
