package ch.kruegel.workshop.dataimport;

import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** CSV and Excel files as other programs write them – fictitious data only. */
class ImportTableTest {

    @Test
    void semicolonCommaOrTab_whateverTheFirstLineHasMost() throws IOException {
        assertThat(cells("Name;Ort\nHuber;Winterthur\n")).containsExactly("Huber", "Winterthur");
        assertThat(cells("Name,Ort\nHuber,Winterthur\n")).containsExactly("Huber", "Winterthur");
        assertThat(cells("Name\tOrt\nHuber\tWinterthur\n")).containsExactly("Huber", "Winterthur");
    }

    @Test
    void quotedValues_mayHoldTheSeparatorQuotesAndLineBreaks() throws IOException {
        ImportTable table = csv("Name;Zusatz;Ort\r\n\"Muster; Söhne AG\";\"z. Hd. \"\"Chef\"\"\nHinterhaus\";Winterthur\r\n");

        assertThat(table.rows()).hasSize(1);
        assertThat(table.rows().getFirst().cells())
                .containsExactly("Muster; Söhne AG", "z. Hd. \"Chef\"\nHinterhaus", "Winterthur");
    }

    @Test
    void theRowNumber_isTheOneExcelShows() throws IOException {
        ImportTable table = csv("Name\nHuber\n\nMeier\n");

        // the empty row 3 is left out, Meier stays row 4
        assertThat(table.rows()).extracting(ImportTable.ImportRow::number).containsExactly(2, 4);
    }

    @Test
    void characterSet_utf8WithOrWithoutBom_elseWindows() throws IOException {
        byte[] bom = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] utf8 = "Name\nMüller\n".getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[bom.length + utf8.length];
        System.arraycopy(bom, 0, withBom, 0, bom.length);
        System.arraycopy(utf8, 0, withBom, bom.length, utf8.length);

        assertThat(firstCell(withBom, null)).isEqualTo("Müller");
        assertThat(ImportTable.read(withBom, null, false).headers()).containsExactly("Name");
        assertThat(firstCell(utf8, null)).isEqualTo("Müller");
        assertThat(firstCell("Name\nMüller\n".getBytes(Charset.forName("windows-1252")), null)).isEqualTo("Müller");
        assertThat(ImportTable.read("Name\nMüller\n".getBytes(Charset.forName("windows-1252")), null, false).charset())
                .isEqualTo("windows-1252");
    }

    @Test
    void excelUnicodeText_isUtf16WithTabs() throws IOException {
        byte[] text = "﻿Name\tOrt\r\nMüller\tZürich\r\n".getBytes(StandardCharsets.UTF_16LE);

        assertThat(ImportTable.read(text, null, false).rows().getFirst().cells()).containsExactly("Müller", "Zürich");
    }

    @Test
    void theCharacterSetChosen_winsOverTheDetectedOne() throws IOException {
        byte[] utf8 = "Name\nMüller\n".getBytes(StandardCharsets.UTF_8);

        assertThat(firstCell(utf8, "windows-1252")).isEqualTo("MÃ¼ller");
    }

    @Test
    void withoutHeaderRow_theColumnsAreNumbered_andTheFirstRowIsData() throws IOException {
        ImportTable table = ImportTable.read("Huber;Winterthur\nMeier;Zürich\n".getBytes(StandardCharsets.UTF_8), null, true);

        assertThat(table.headers()).containsExactly("Spalte 1", "Spalte 2");
        assertThat(table.rows()).hasSize(2);
        assertThat(table.rows().getFirst().number()).isEqualTo(1);
    }

    @Test
    void anEmptyHeader_getsANumber() throws IOException {
        assertThat(csv("Name;;Ort\nHuber;x;Winterthur\n").headers()).containsExactly("Name", "Spalte 2", "Ort");
    }

    @Test
    void excel_numbersWithoutDecimals_datesAsIsoText() throws IOException {
        ImportTable table = ImportTable.read(excel(), null, false);

        assertThat(table.charset()).isNull();
        assertThat(table.headers()).containsExactly("Name", "PLZ", "1. Inv.");
        assertThat(table.rows().getFirst().cells()).containsExactly("Huber", "8400", "2015-03-31");
    }

    private static byte[] excel() throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Workbook workbook = new Workbook(out, "test", "1.0");
            Worksheet sheet = workbook.newWorksheet("Export");
            sheet.value(0, 0, "Name");
            sheet.value(0, 1, "PLZ");
            sheet.value(0, 2, "1. Inv.");
            sheet.value(1, 0, "Huber");
            sheet.value(1, 1, 8400);
            sheet.value(1, 2, LocalDate.of(2015, 3, 31));
            sheet.style(1, 2).format("dd.mm.yyyy").set();
            workbook.finish();
            return out.toByteArray();
        }
    }

    private static List<String> cells(String text) throws IOException {
        return csv(text).rows().getFirst().cells();
    }

    private static String firstCell(byte[] file, String charset) throws IOException {
        return ImportTable.read(file, charset, false).rows().getFirst().cell(0);
    }

    private static ImportTable csv(String text) throws IOException {
        return ImportTable.read(text.getBytes(StandardCharsets.UTF_8), null, false);
    }
}
