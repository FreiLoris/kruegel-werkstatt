package ch.kruegel.workshop.swissgarage;

import ch.kruegel.workshop.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.util.List;

/**
 * Log entry of one SwissGarage import. Who and when come from {@code createdBy}/{@code createdAt}.
 * Written once, never changed.
 */
@Entity
public class ImportRun extends BaseEntity {

    public enum Kind { CUSTOMERS, VEHICLES }

    /** More problems are cut off – the first ones show what is wrong with the file. */
    static final int MAX_PROBLEMS = 50;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(nullable = false)
    private String fileName;

    private int rowsRead;
    private int skipped;
    private int created;
    private int updated;
    private int unchanged;
    private int deactivated;

    private String problems;

    protected ImportRun() {
        // for JPA
    }

    ImportRun(Kind kind, String fileName, ImportCounts counts) {
        this.kind = kind;
        this.fileName = fileName;
        this.rowsRead = counts.rowsRead();
        this.skipped = counts.skipped();
        this.created = counts.created();
        this.updated = counts.updated();
        this.unchanged = counts.unchanged();
        this.deactivated = counts.deactivated();
        List<String> list = counts.problems();
        this.problems = list.isEmpty() ? null : String.join("\n", list.stream().limit(MAX_PROBLEMS).toList())
                + (list.size() > MAX_PROBLEMS ? "\n… und " + (list.size() - MAX_PROBLEMS) + " weitere" : "");
    }

    public Kind getKind() {
        return kind;
    }

    public String getFileName() {
        return fileName;
    }

    public ImportCounts getCounts() {
        return new ImportCounts(rowsRead, skipped, created, updated, unchanged, deactivated,
                problems == null ? List.of() : List.of(problems.split("\n")));
    }
}
