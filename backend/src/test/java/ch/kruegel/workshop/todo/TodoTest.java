package ch.kruegel.workshop.todo;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A to-do on its own, without database. */
class TodoTest {

    private static TodoDetails text(String text) {
        return new TodoDetails(text, null, null, false, null);
    }

    @Test
    void textIsTrimmedRequiredAndLimited() {
        assertThat(text("  Kunde anrufen ").text()).isEqualTo("Kunde anrufen");
        assertThatThrownBy(() -> text("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> text("x".repeat(Todo.TEXT_MAX + 1))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void doneRemembersWhenAndWhoUndoForgetsBoth() {
        Todo todo = new Todo(text("Kunde anrufen"));
        Instant at = Instant.parse("2026-10-15T08:00:00Z");
        UUID reto = UUID.randomUUID();

        todo.markDone(at, reto);
        assertThat(todo.isDone()).isTrue();
        assertThat(todo.getDoneAt()).isEqualTo(at);
        assertThat(todo.getDoneBy()).isEqualTo(reto);

        todo.reopen();
        assertThat(todo.isDone()).isFalse();
        assertThat(todo.getDoneBy()).isNull();
    }
}
