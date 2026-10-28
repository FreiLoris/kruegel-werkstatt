package ch.kruegel.workshop.statistics;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Shopping list, stock and courtesy cars. */
public record MaterialStatisticsDto(
        long shoppingItems,
        @Schema(description = "Label = a ShoppingStatus, e.g. TO_ORDER or ARRIVED") List<CountDto> shoppingStatus,
        List<CountDto> suppliers,
        @Schema(types = {"number", "null"}, format = "double", description = "Average days from ordered to arrived, null if none arrived") Double averageDeliveryDays,
        long stockItems,
        @Schema(description = "All pieces in stock added up") long stockQuantity,
        @Schema(description = "Label = SPARE_PART, CONSUMABLE or TOOL") List<CountDto> stockCategories,
        long courtesyBookings,
        List<CountDto> courtesyCars,
        @Schema(description = "Days all courtesy cars were out together") long courtesyDays) {
}
