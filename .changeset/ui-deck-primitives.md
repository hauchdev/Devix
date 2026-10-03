---
"@devix-cli/ui": minor
---

Add Rich-style layout primitives and a semantic colour theme.

`Deck` brings the shapes that make output look composed rather than
printed: a box whose title sits in its own top border, a grid of cards,
a proportional meter, a tree with real box-drawing connectors, key caps
and wrapping chips. `Painter` and `Theme` separate what a _meaning_ looks
like from the mechanism that emits the escape codes, so the palette lives
in one place.

`Ui.deck` exposes them through the renderer that already detects
capabilities, so a command gets themed output without re-detecting
anything. Nothing existing changed: `Styler`, `Ui` and every current
method keep their behaviour, and the ASCII symbol set is still enforced
as printable ASCII by a test.

Two sizing bugs found while writing the tests, both of which the width
tests now cover: a card row overflowed the terminal because the last
column's rule was counted one character short, and a meter measured its
bar against a label column that had already been truncated for display.
