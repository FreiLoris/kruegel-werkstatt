package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The statistics page (15a) – informative and just for fun. */
@RestController
@RequestMapping("/api/statistics")
@Tag(name = "Statistics")
class StatisticsController {

    private final StatisticsService service;

    StatisticsController(StatisticsService service) {
        this.service = service;
    }

    @Operation(summary = "All statistics",
            description = "Tasks, vehicles, customers, tyre hotel, team and material, counted today. Read only.")
    @GetMapping
    StatisticsDto all() {
        return service.all();
    }
}
