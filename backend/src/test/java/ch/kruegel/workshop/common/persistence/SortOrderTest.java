package ch.kruegel.workshop.common.persistence;

import ch.kruegel.workshop.common.web.InvalidInputException;
import ch.kruegel.workshop.common.web.NotFoundException;
import org.junit.jupiter.api.Test;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SortOrderTest {

    /** Minimal entry only for this test */
    static final class Entry implements Sortable {
        final UUID id = UUID.randomUUID();
        final String name;
        int position;

        Entry(String name, int position) {
            this.name = name;
            this.position = position;
        }

        @Override
        public UUID getId() {
            return id;
        }

        @Override
        public void moveTo(int sortOrder) {
            position = sortOrder;
        }
    }

    private final Entry a = new Entry("A", 0);
    private final Entry b = new Entry("B", 1);
    private final Entry c = new Entry("C", 5); // the gap gets closed
    private final List<Entry> current = List.of(a, b, c);

    @Test
    void givenOnesFirstRestBehindWithoutGaps() {
        SortOrder.reorder(current, List.of(c.id, a.id), "Eintrag");

        assertThat(sorted()).containsExactly("C", "A", "B");
        assertThat(c.position).isZero();
        assertThat(b.position).isEqualTo(2);
    }

    @Test
    void duplicateIdIsInvalidInput() {
        assertThatThrownBy(() -> SortOrder.reorder(current, List.of(a.id, a.id), "Eintrag"))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    void unknownIdIsReported() {
        assertThatThrownBy(() -> SortOrder.reorder(current, List.of(UUID.randomUUID()), "Eintrag"))
                .isInstanceOf(NotFoundException.class);
    }

    private List<String> sorted() {
        return current.stream().sorted(Comparator.comparingInt(e -> e.position)).map(e -> e.name).toList();
    }
}
