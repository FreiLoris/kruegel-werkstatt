-- An own pinboard column means notes are assigned there – the person must be selectable for to-dos
-- and notes (otherwise "+ Notiz" and dropping into the column always failed).
UPDATE employee SET selectable_for_todos = true WHERE has_pinboard_column AND NOT selectable_for_todos;

ALTER TABLE employee ADD CONSTRAINT employee_pinboard_column_selectable
    CHECK (NOT has_pinboard_column OR selectable_for_todos);
