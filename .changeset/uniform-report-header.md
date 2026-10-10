---
"devix-cli": minor
"@devix-cli/ui": patch
---

Every command now opens the way `devix` itself opens.

The landing panel had a banner — name, one line of purpose, a full-width
rule — while every other command printed a bare title and jumped straight
into its sections, so the CLI looked like one styled panel bolted onto a
set of plain commands. `status`, `doctor`, `detect`, `config`, `deps`,
`docker`, `git`, `plugin`, `minecraft` and `web` now use the same banner,
taken from the command's own description, and the same boxed sections
below it.

The panel's summary line is a field like every other section, so no
report mixes prose paragraphs with aligned rows. The banner truncates its
tagline to one line, because a wrapped tagline would push the rule down
and break the shape every report shares.
