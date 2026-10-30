package ch.kruegel.workshop.dataimport;

import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.ReadingOptions;
import org.dhatim.fastexcel.reader.Row;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

/**
 * A file of another program (neutral 5) as a plain table: columns by POSITION, not by name – the
 * names differ from program to program, the user maps them. CSV (any separator, any of the usual
 * character sets) or Excel (xlsx, first sheet).
 *
 * @param headers   the first row, or "Spalte 1", "Spalte 2" … if it holds data already
 * @param rows      the data rows without empty ones
 * @param charset   the character set of a CSV file; {@code null} for Excel
 */
record ImportTable(List<String> headers, List<ImportRow> rows, String charset) {

    static final String UTF_8 = "UTF-8";
    static final String WINDOWS = "windows-1252";
    /** What the user can choose when the umlauts look wrong */
    static final List<String> CHARSETS = List.of(UTF_8, WINDOWS);

    /** The file cannot be read as a table – the message says why, in German */
    static final class UnreadableFileException extends RuntimeException {
        UnreadableFileException(String message) {
            super(message);
        }
    }

    /** One data row; {@code number} as Excel shows it (header = 1) – for "Zeile 17: …" */
    record ImportRow(int number, List<String> cells) {

        /** The cell, stripped; "" if the row is shorter */
        String cell(int column) {
            return column < cells.size() ? cells.get(column).strip() : "";
        }

        boolean isEmpty() {
            return cells.stream().allMatch(String::isBlank);
        }
    }

    /**
     * @param charset        {@code null}: found out from the file
     * @param firstRowIsData the file has no header row
     * @throws IOException if it is no readable Excel file
     */
    static ImportTable read(byte[] file, String charset, boolean firstRowIsData) throws IOException {
        boolean excel = file.length > 3 && file[0] == 'P' && file[1] == 'K' && file[2] == 3 && file[3] == 4;
        if (excel) {
            return of(excel(file), null, firstRowIsData);
        }
        Charset chosen = charset == null ? detectCharset(file) : Charset.forName(canonical(charset));
        return of(Csv.parse(decode(file, chosen)), chosen.name(), firstRowIsData);
    }

    private static ImportTable of(List<ImportRow> lines, String charset, boolean firstRowIsData) {
        int columns = lines.stream().mapToInt(row -> row.cells().size()).max().orElse(0);
        List<String> headers = new ArrayList<>();
        List<ImportRow> rows = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            ImportRow line = lines.get(i);
            if (i == 0 && !firstRowIsData) {
                for (int c = 0; c < columns; c++) {
                    String header = line.cell(c);
                    headers.add(header.isEmpty() ? "Spalte " + (c + 1) : header);
                }
            } else if (!line.isEmpty()) {
                rows.add(line);
            }
        }
        if (firstRowIsData) {
            for (int c = 0; c < columns; c++) {
                headers.add("Spalte " + (c + 1));
            }
        }
        return new ImportTable(headers, rows, charset);
    }

    /**
     * BOM first (Excel's "CSV UTF-8" has one, "Unicode-Text" is UTF-16); without one: valid UTF-8 or
     * else Windows – what Excel writes as plain "CSV" on a Swiss PC.
     */
    static Charset detectCharset(byte[] file) {
        if (hasUtf8Bom(file)) {
            return StandardCharsets.UTF_8;
        }
        if (file.length >= 2 && (file[0] & 0xFF) == 0xFF && (file[1] & 0xFF) == 0xFE) {
            return StandardCharsets.UTF_16LE;
        }
        if (file.length >= 2 && (file[0] & 0xFF) == 0xFE && (file[1] & 0xFF) == 0xFF) {
            return StandardCharsets.UTF_16BE;
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(file));
            return StandardCharsets.UTF_8;
        } catch (CharacterCodingException e) {
            return Charset.forName(WINDOWS);
        }
    }

    /** Chosen by the user, or what the preview said – whatever the case */
    static boolean isKnownCharset(String name) {
        return canonical(name) != null;
    }

    private static String canonical(String name) {
        return Stream.concat(CHARSETS.stream(), Stream.of("UTF-16LE", "UTF-16BE"))
                .filter(known -> known.equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }

    private static boolean hasUtf8Bom(byte[] file) {
        return file.length >= 3 && (file[0] & 0xFF) == 0xEF && (file[1] & 0xFF) == 0xBB && (file[2] & 0xFF) == 0xBF;
    }

    private static String decode(byte[] file, Charset charset) {
        // the UTF-8 mark also when the user chose Windows – else "ï»¿" stands before the first header
        String text = hasUtf8Bom(file) && !charset.name().startsWith("UTF-16")
                ? new String(file, 3, file.length - 3, charset)
                : new String(file, charset);
        return text.startsWith("\uFEFF") ? text.substring(1) : text;
    }

    private static List<ImportRow> excel(byte[] file) throws IOException {
        // with the cell formats: a date is a number in Excel, only its format says it is a date
        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file), new ReadingOptions(true, false));
             Stream<Row> stream = workbook.getFirstSheet().openStream()) {
            List<ImportRow> rows = new ArrayList<>();
            stream.forEach(row -> {
                List<String> cells = new ArrayList<>();
                for (int i = 0; i < row.getCellCount(); i++) {
                    cells.add(text(row.getCell(i)));
                }
                rows.add(new ImportRow(row.getRowNum(), cells));
            });
            return rows;
        }
    }

    /** Numbers without ".0" (postal code 8400), dates as ISO text (2015-03-31) – {@link ImportValues} reads both */
    private static String text(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getType()) {
            case NUMBER -> isDate(cell)
                    ? cell.asDate().toLocalDate().toString()
                    : cell.asNumber().stripTrailingZeros().toPlainString();
            case EMPTY -> "";
            default -> cell.getText() == null ? "" : cell.getText().strip();
        };
    }

    /** The built-in date formats of Excel, or an own one with day or year ("m" alone could be minutes) */
    private static boolean isDate(Cell cell) {
        Integer id = cell.getDataFormatId();
        if (id != null && (id >= 14 && id <= 17 || id == 22)) {
            return true;
        }
        String format = cell.getDataFormatString();
        if (format == null) {
            return false;
        }
        // without colours/locales in [] and literal text in ""
        String plain = format.replaceAll("\\[[^]]*]|\"[^\"]*\"", "").toLowerCase(Locale.ROOT);
        return (plain.contains("d") || plain.contains("y") || plain.contains("j")) && !plain.contains("0") && !plain.contains("#");
    }

    /**
     * CSV as Excel and other programs write it: separator semicolon, comma or tab (the most frequent
     * one in the first line); values in "…" may contain the separator, line breaks and "" for ".
     */
    static final class Csv {

        private Csv() {
        }

        static List<ImportRow> parse(String text) {
            char separator = separator(text);
            List<ImportRow> rows = new ArrayList<>();
            List<String> cells = new ArrayList<>();
            StringBuilder cell = new StringBuilder();
            boolean quoted = false;
            int quoteRow = 0;
            int i = 0;
            while (i < text.length()) {
                char c = text.charAt(i);
                if (quoted) {
                    if (c == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++;
                    } else if (c == '"') {
                        quoted = false;
                    } else {
                        cell.append(c);
                    }
                } else if (c == '"' && cell.toString().isBlank()) {
                    quoted = true;
                    quoteRow = rows.size() + 1;
                    cell.setLength(0);
                } else if (c == separator) {
                    cells.add(cell.toString());
                    cell.setLength(0);
                } else if (c == '\r' || c == '\n') {
                    if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                        i++;
                    }
                    cells.add(cell.toString());
                    cell.setLength(0);
                    rows.add(new ImportRow(rows.size() + 1, cells));
                    cells = new ArrayList<>();
                } else {
                    cell.append(c);
                }
                i++;
            }
            if (quoted) {
                // else the rest of the file would silently be one cell
                throw new UnreadableFileException("Ein Anführungszeichen in Zeile " + quoteRow
                        + " wird nicht geschlossen – die Datei ist so nicht lesbar.");
            }
            if (!cell.isEmpty() || !cells.isEmpty()) {
                cells.add(cell.toString());
                rows.add(new ImportRow(rows.size() + 1, cells));
            }
            return rows;
        }

        /** The most frequent of ; , tab in the first line, outside of quotes – semicolon if none */
        static char separator(String text) {
            int semicolons = 0, commas = 0, tabs = 0;
            boolean quoted = false;
            for (int i = 0; i < text.length(); i++) {
                char c = text.charAt(i);
                if (c == '"') {
                    quoted = !quoted;
                } else if (!quoted && (c == '\n' || c == '\r')) {
                    break;
                } else if (!quoted) {
                    switch (c) {
                        case ';' -> semicolons++;
                        case ',' -> commas++;
                        case '\t' -> tabs++;
                        default -> { }
                    }
                }
            }
            if (tabs > semicolons && tabs > commas) {
                return '\t';
            }
            return commas > semicolons ? ',' : ';';
        }
    }

    int columnCount() {
        return headers.size();
    }

    /** First rows for the preview */
    List<ImportRow> firstRows(int count) {
        return rows.subList(0, Math.min(count, rows.size()));
    }
}
