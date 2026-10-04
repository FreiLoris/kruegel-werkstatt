package ch.kruegel.workshop.swissgarage;

import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * The first sheet of an Excel file (xlsx) as rows with values by column name.
 *
 * <p>Columns are found by their header text, not by position – SwissGarage exports can contain
 * additional columns or a different order. Headers are compared without surrounding whitespace
 * ("Adressart " in some exports).
 */
final class ExcelSheet {

    private final List<String> headers;
    private final List<ExcelRow> rows;

    private ExcelSheet(List<String> headers, List<ExcelRow> rows) {
        this.headers = headers;
        this.rows = rows;
    }

    /** Reads the whole first sheet. Streaming under the hood – only the values stay in memory. */
    static ExcelSheet read(InputStream input) throws IOException {
        try (ReadableWorkbook workbook = new ReadableWorkbook(input); Stream<Row> stream = workbook.getFirstSheet().openStream()) {
            List<String> headers = new ArrayList<>();
            List<ExcelRow> rows = new ArrayList<>();
            stream.forEach(row -> {
                if (headers.isEmpty()) {
                    row.forEach(cell -> headers.add(text(cell)));
                    return;
                }
                Map<String, String> values = new HashMap<>();
                for (int i = 0; i < headers.size(); i++) {
                    // Excel does not store empty cells at the end of a row – the row is shorter than the header
                    values.put(headers.get(i), i < row.getCellCount() ? text(row.getCell(i)) : "");
                }
                rows.add(new ExcelRow(row.getRowNum(), values));
            });
            return new ExcelSheet(headers, rows);
        }
    }

    boolean hasColumn(String header) {
        return headers.contains(header);
    }

    List<ExcelRow> rows() {
        return rows;
    }

    /**
     * Cell as text: numbers without ".0" (postal code 8400, not "8400.0"), empty cells as "".
     * Dates are not converted here – Excel stores them as numbers, the caller knows the column.
     */
    private static String text(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getType()) {
            case NUMBER -> {
                BigDecimal number = cell.asNumber();
                yield number.stripTrailingZeros().toPlainString();
            }
            case EMPTY -> "";
            default -> cell.getText() == null ? "" : cell.getText().strip();
        };
    }

    /** One data row; {@code number} is the row number as Excel shows it (header = 1). */
    record ExcelRow(int number, Map<String, String> values) {

        /** Value of the first of the given columns that has one – e.g. "Tel.1" or "Telefon 1". */
        String get(String... columns) {
            for (String column : columns) {
                String value = values.get(column);
                if (value != null && !value.isBlank()) {
                    return value.strip();
                }
            }
            return "";
        }

        boolean isEmpty() {
            return values.values().stream().allMatch(String::isBlank);
        }
    }
}
