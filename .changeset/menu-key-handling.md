---
"@devix-cli/ui": patch
---

Fix the interactive menu so the arrow keys and Enter actually work.

The menu never put the terminal in raw mode, so keys were buffered until
Enter and the arrow keys appeared to do nothing — pressing them showed no
movement, and the selection only registered on the next line. Raw mode is
now set for the duration and restored on every exit path, including
cancel.

An arrow key whose escape sequence arrived in two reads (`ESC` then `[B`)
was treated as a lone Escape and closed the menu. A lone Escape is now
given 50ms for the rest of the sequence to arrive before it is read as a
cancel, which is what a terminal needs and below the delay a keypress
feels.

The first frame no longer clears lines it did not draw: it used to erase
whatever the command had printed above the menu. A CRLF Enter is read as
one keypress rather than two, and the reader only detaches its own
listeners instead of every `data` listener on the stream.
