# ADR 0002 – English as code language

- **Status:** Accepted
- **Date:** 2026-10-04
- **Replaces:** the rule "domain terms in German" from the first version of the conventions

## Context

Phases 1–4b were written with German domain names (`Mitarbeiter`, `erstelltAm`,
`/api/mitarbeiter`) and English technical suffixes (`MitarbeiterService`). The idea was to
keep code and workshop language identical ("ubiquitous language").

In practice that produced a constant mix (`MitarbeiterRepository.existsByAktivTrue…`),
identifiers with transliterated umlauts (`geaendertAm`) and code that is hard to share
with tools, libraries and other developers – who all expect English.

## Decision

- **Code is English**: identifiers, packages, files, database tables/columns, API paths and
  JSON fields, live topics, comments, Javadoc, documentation and commit messages.
- **The app stays German**: every text the user sees (UI, toasts, validation and error
  messages, `title`/`detail` of Problem Details).
- **One glossary** ([`docs/glossary.md`](../glossary.md)) translates every domain term exactly
  once. Swiss terms without a clear translation keep their name (`mfk`).
- **Not renamed**: product and infrastructure names (repository `kruegel-werkstatt`, database
  name/user `werkstatt`, Docker project, Maven artifact) and merged Flyway migrations V1–V5.
- Done in step 4r, before more modules are added – while there is no production data yet.

## Consequences

- Migration `V6__english_names.sql` renames tables, columns, stored role values and every
  constraint/index name. A test checks that no German name is left.
- The API changed (`/api/employees`, `/api/service-items`, `errors[field, message]`) – frontend
  and backend were switched in the same pull request.
- Devices store their person under a new key and have to pick it once more.
- The analysis of the old app (`docs/analysis/`) stays German: it is a historical record that
  quotes the old UI.
- Domain discussions happen in German; whoever writes code looks the term up in the glossary.
