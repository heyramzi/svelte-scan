<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# The shell a Bash call gets

Every Bash call starts a fresh shell at the repo root, and the transcript says `Shell cwd was reset to ...` after any call that changed directory. Write absolute paths, or `cd` inside the same call. A `cd` on one call and the work on the next is the most common wasted call in this workspace.

zsh and macOS, each one a round trip lost before:

- Never name a shell variable `path`. zsh ties it to `PATH`, so `read -r path ...` empties `PATH` and the next line says `command not found: curl`.
- Quote a `--include` glob, or zsh expands it first and the call dies with `no matches found`.
- A list of paths or ids in one variable stays one word in zsh, so `git add $P` looks for one file named after the whole list. Use an array: `P=(a b)`, then `"${P[@]}"`.
- A `pnpm` or `npx` call inside `while read` eats the loop's stdin, so the loop stops after the first row. Give it `</dev/null`.
- Quote anything that starts with `=`. A bare `===` is equals expansion and answers `== not found`.
- Brace a variable that's followed by a colon. zsh reads `$FONT:text=...` as the history modifier `:t`.
- `cd` prints a terminal-title escape (`]1;web`) to stdout, so `K=$(cd web && cmd)` captures it with the value. A key written that way fails auth. `cd` before the `$(...)`.
- `timeout` isn't installed. Use the Bash tool's own `timeout` parameter.
- Call `/usr/bin/log` for the unified log. zsh's `log` builtin answers `too many arguments`.
- Call `~/.local/bin/claude` for a `claude` subcommand. The shell snapshot's `claude` function appends `-p`, so `claude plugin list` dies on `Input must be provided`.

Edit source with the Edit tool, never a python heredoc doing string replacement, because a heredoc can't see the syntax it's breaking. Script a change only when it repeats across many files, then typecheck right after.
