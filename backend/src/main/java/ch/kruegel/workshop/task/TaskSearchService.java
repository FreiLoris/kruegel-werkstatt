package ch.kruegel.workshop.task;

import ch.kruegel.workshop.common.SearchWords;
import ch.kruegel.workshop.common.web.InvalidInputException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Search over all appointments (F11) – own service, the task service is big enough. */
@Service
@Transactional(readOnly = true)
public class TaskSearchService {

    static final int MAX_LIMIT = 100;

    private final TaskSearchRepository search;
    private final TaskRepository tasks;
    private final Clock clock;

    TaskSearchService(TaskSearchRepository search, TaskRepository tasks, Clock clock) {
        this.search = search;
        this.tasks = tasks;
        this.clock = clock;
    }

    public TaskSearchResultDto search(String query, int limit) {
        List<String> words = SearchWords.of(query);
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new InvalidInputException("limit", "muss zwischen 1 und " + MAX_LIMIT + " liegen");
        }
        // one more than asked for: tells whether there are more hits
        List<UUID> ids = search.search(words, LocalDate.now(clock), limit + 1);
        List<UUID> shown = ids.stream().limit(limit).toList();

        // one query for all hits, then back into the order of the search
        Map<UUID, Task> byId = tasks.findByIdIn(shown).stream().collect(Collectors.toMap(Task::getId, Function.identity()));
        List<TaskDto> hits = shown.stream().map(byId::get).filter(Objects::nonNull).map(TaskDto::of).toList();
        return new TaskSearchResultDto(hits, ids.size() > limit);
    }
}
