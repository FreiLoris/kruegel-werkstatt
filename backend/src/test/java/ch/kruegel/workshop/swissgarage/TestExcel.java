package ch.kruegel.workshop.swissgarage;

import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Builds Excel files for tests – with fictitious data only, never real SwissGarage exports.
 *
 * <pre>
 *   byte[] file = TestExcel.with("Adressnummer", "Name").row(1001, "Huber").bytes();
 * </pre>
 * Numbers are written as number cells (like SwissGarage does for postal codes and numbers).
 */
final class TestExcel {

    private final List<String> headers;
    private final List<List<Object>> rows = new ArrayList<>();

    private TestExcel(List<String> headers) {
        this.headers = headers;
    }

    static TestExcel with(String... headers) {
        return new TestExcel(List.of(headers));
    }

    TestExcel row(Object... values) {
        rows.add(Arrays.asList(values)); // allows null = empty cell
        return this;
    }

    byte[] bytes() {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Workbook workbook = new Workbook(out, "test", "1.0");
            Worksheet sheet = workbook.newWorksheet("Export");
            for (int c = 0; c < headers.size(); c++) {
                sheet.value(0, c, headers.get(c));
            }
            for (int r = 0; r < rows.size(); r++) {
                List<Object> row = rows.get(r);
                for (int c = 0; c < row.size(); c++) {
                    Object value = row.get(c);
                    if (value instanceof Number number) {
                        sheet.value(r + 1, c, number);
                    } else if (value != null) {
                        sheet.value(r + 1, c, value.toString());
                    }
                }
            }
            workbook.finish();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
