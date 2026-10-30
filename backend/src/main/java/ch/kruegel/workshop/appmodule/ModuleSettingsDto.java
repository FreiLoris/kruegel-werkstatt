package ch.kruegel.workshop.appmodule;

import java.util.List;

/** The parts of the app, in the menu's order, and which ones the workshop uses (neutral 3). */
public record ModuleSettingsDto(long version, List<ModuleDto> modules) {
}
