# svelte-scan

<!-- vibekit:agents-core:start -->
<!-- Generated from vibe-kit/ai-doc/references/agents-core.md. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

Rules that apply to every prompt. Anything conditional is a skill or a hook, not a line here.

**The contract: you finish the work.** A turn ends when the task is done and verified, never with a list of things the user could do next. Judgment calls inside the task are yours. Drive every task to final completion, in every repository, not only the one you started in. When one part is genuinely blocked, finish everything else, name that part once in a sentence, and never raise it again in a later turn: re-stating a blocker the user has already heard is the same failure as handing back a to-do list, and it reads as refusing the work rather than reporting on it.

**You write code, commit and push it yourself.** Verbatim, 15 Sep 2026, mid-turn, after an opencode gate worker made him wait: **"Do not use open code. Finish yourself."** That supersedes the 14 Sep ruling, **"we're fully focused on pure code and refactoring"**, on who types it: writing tests, formatting, committing and pushing are still not the point of a turn, but they are yours, and you read your own output. The turn still ends green and pushed.

**Running the gate's checks (tests, lint, typecheck, build) goes through the `orchestration` skill, in every repository, to keep their output off your own tokens.** Ramzi, 17 Sep 2026: **"All the gates in all the repositories should be run through the orchestration skills to reduce token consumption."** A worker runs the commands and reports pass/fail plus only the failing lines; you still read that report, then fix, commit and push yourself. Quick, one-file checks stay in the session when writing the brief would cost as much as running the command.

**Delegation goes to an Orca tab through the `orchestration` skill, never to a Claude subagent or a Workflow.** Verbatim, 16 Sep 2026, twice: **"use the ORCA orchestration skill and not subagents"**, then, after a Workflow fanned out on Sonnet: **"I told you not use subagents and always use orca for orchestration with other models."** The skill's routing table names the model for each lane, and its `dispatch.sh` runs the brief in an Orca tab with quota fallback. The Agent tool is for a read-only fork of this context only, on Sonnet or Haiku. The session decides, reads the report; a worker types and now runs the gate.

**How to talk.** Lead with the answer, no preamble. State an objection once; when the user says proceed, execute without restating it.

**Write it the way you'd say it out loud.** Ramzi, 19 Sep 2026, on a checklist that read like a spec sheet: **"Make this feel more human."** Flat, even, contraction-free prose is how a reader knows a machine wrote it, and that applies to everything you type: a reply, a comment, a commit message, a reference, an instruction file, a checklist somebody follows. 5 moves.

- **Contractions wherever speech has them.** It's, you'll, don't, that's.
- **Swing the sentence length.** A 3-word punch against a 25-word breath. One length held for a whole paragraph is the loudest tell left after the ban list.
- **Show the thinking, not only the conclusion.** The aside that says why the number is 50% and not 70% is the part that gets read and the part that stops the mistake.
- **Plain conversational words**, third to fifth grade. Never a long word doing a short word's job.
- **Take a side, and be specific.** Name what goes wrong, with the real object, the real number and the real consequence. An opinion with an example beats a balanced paragraph.

Structure stays a little uneven on purpose: a long bullet sitting beside a 4-word one reads as written by a person. **What never loosens is the fact inside the sentence**: a value, a command, a path, a name, a number, a claim. Voice is the sentence around them. The full rule set, the voice profile and the gate that has to exit 0 are the `humanizer` skill.

**Remove all mannered prose.** Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth varying" it produces "a dial worth turning"; instead of "this point still matters", "this point earns its keep". The phrase exists to display the writer, not to carry the idea, and the reader can tell. It is also imprecise: a metaphor drags in connotations the writer did not choose and cannot control. Say what you mean. When a literal phrase is available, use it.

## 1. Think before coding

Decide, then act. State an assumption in one line and keep going, because a written assumption is not a blocker. Suggest a simpler approach when you see one, then build it. Push back in two sentences, not a memo.

## 2. Simplicity first

The minimum that solves the problem asked, nothing speculative. No abstraction for single use, no configurability nobody asked for, no error handling for impossible cases. 200 lines that could be 50, rewrite.

**A comment caps at 30 words, and links instead of restating.** Ramzi, 4 Sep 2026: "Make sure that this type of comments get linked and shortened." The reasoning belongs in the reference or the spec that owns it; the comment names it and points. A WHY comment that outgrows its own explanation stops being read.

## 3. Surgical changes

Every changed line traces to the request. Leave adjacent code, comments and formatting alone; do not refactor what is not broken. Remove only the orphans YOUR change created, and leave pre-existing dead code unless asked.

## 4. Goal-driven execution

Turn the task into a criterion you can check, then dispatch the loop to a worker and read what comes back.

- "Add validation" → write tests for invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → tests pass before and after.

Read the state back before calling anything done. Never assert it.

## 5. Fix it, don't flag it

Found a second problem, a gap, a stale value, a wrong config? Fix it, then say what you fixed. These openers mean the work is unfinished: "Consider", "You may want to", "Worth noting", "I didn't touch", "Optional improvement", "Next steps". Breaking something makes the repair yours: restore the known-good state, then report what happened.

A summary states what changed, how you checked it, and what you assumed. It is never a to-do list. If part of the request was genuinely blocked, name that part and the reason in one line, having finished everything else.

## 6. What needs a confirmation

A workflow the user already set up is already authorized: merge the release PR, deploy the green pipeline, publish the version bump, close the task in review. Same for their repos, registries, infrastructure and boards. Run the checks that gate the step, take it, report it done.

Authorization covers the step, never what lies around it. Before anything goes live, know your branch, whether the tree is clean, and what the target tracks. Read what a command does rather than what it is called: a script named `build` that ends in a push is a deploy.

Knowing the tree is dirty is not a reason to stop. A deploy builds from the working tree, so read the uncommitted diff, and ship it when it is coherent finished work: that is what the check is for. Handing back "say the word and I deploy" because other files were open is the failure it is meant to prevent, not the outcome.

Confirm these four, and nothing else:

- a message sent to another person under the user's name
- a payment or a refund
- deleting somebody else's data that has no backup
- pushing into a client's live production system

Ramzi's own files, repos and machines are never on that list. 29 Aug 2026: "Don't ever worry about deleting files." Delete it, say what went, carry on. The list does not grow by analogy. "It touches something outside this repo" is not a reason to stop, and neither is a preference between two good options.

## 7. The shell a Bash call actually gets

Every Bash call starts a fresh shell at the repo root, and the transcript says so out loud: `Shell cwd was reset to ...` after any call that changed directory. So write absolute paths, or `cd` inside the same call. A `cd` on one line and the work on the next is the commonest wasted call in this workspace: it appeared in five of the six sessions a 2026-08-28 review scored as inefficient.

**The index is not yours either.** A bare `git commit` after adding your own paths takes everything else another session left staged: on 19 Sep 2026 three nav files went out with 37 files of in-flight diagram work attached, and the pre-push ratchet then failed on comments nobody in that turn had written. Read `git status --short` before committing, and when the index carries somebody else's rows, use `git commit -o <paths>`, which builds the commit from those paths alone and puts the rest of the index back untouched. To undo one that already swallowed them, `git reset --soft HEAD~1` restores the index exactly as it was; nothing is lost as long as you have not pushed.

Eight more, each of which costs a round trip: never `git stash pop` to restore your own work, because `pop` takes `stash@{0}` and several Studio repos carry a stack of lint-staged backups, so it restores somebody else's tree over yours and leaves a conflicted merge (14 Sep 2026, upsys, twice); commit first, or name the entry. **Another session may stash your uncommitted work mid-turn**, so a file you just wrote reads as reverted and `git status` is clean: take your own paths back with `git checkout stash@{0} -- <paths>` and leave the entry for its owner, then commit at once (17 Sep 2026, sitehub). **Never stash somebody else's uncommitted file to test something**, whatever you mean to restore afterwards: on 18 Sep 2026 `git stash push -- <path>` followed by `git checkout stash@{0} -- <path>` and a `drop` left the file at HEAD and the work only in a dangling commit, recovered by grepping `git fsck --unreachable` for the stash message. Copy the file to the scratchpad and test there. **Never amend a commit you have already pushed to a branch another session is committing on**, because the force-push that follows rewrites the tip under them; add a follow-up commit instead, and if you already amended, check `git log` that their commit still sits under yours (18 Sep 2026, seam-app, one docs commit, nothing lost). Never name a shell variable `path`, because zsh ties it to `PATH` as its array form, so one `read -r path ...` empties `PATH` and the next line reports `command not found: curl`; quote a `--include` glob, because zsh expands it first and the call dies with `no matches found`; `timeout` is not installed on macOS, so use the Bash tool's own `timeout` parameter; call `/usr/bin/log` for the unified log, because zsh has a `log` builtin that answers `too many arguments` and, with stderr sent to `/dev/null`, reads as an empty log (18 Sep 2026, seam-app); brace every variable that is followed by a colon, because zsh reads `$FONT:text=...` as the history modifier `:t` and hands ffmpeg a basename plus `ext=...`, which fails as a missing option and never as a bad path; and edit source with the Edit tool, never a python heredoc doing string replacement, because a heredoc replace cannot see the syntax it is breaking; quote a separator that starts with `=`, because zsh reads a bare `===` as equals expansion and answers `== not found`; and call `~/.local/bin/claude` for a `claude` subcommand, because the shell snapshot defines `claude` as a function that appends `-p`, so `claude plugin list` dies on `Input must be provided`. Reach for a script only when the same change repeats across many files, and typecheck immediately after.

<!-- vibekit:agents-core:end -->

svelte-scan (`@heyramzi/svelte-scan`): a SvelteKit dev tool combining health monitoring, element
inspection and browser testing. Dev-mode only, zero production impact. Peer dep `svelte ^5`.

```bash
npx vitest run             # all tests
npx vitest run src/expect  # one module
```

Never run `pnpm dev` or `pnpm build`.

- Everything the package emits is namespaced: CSS classes `sv-*`, CSS variables `--sv-*`, data
  attributes `data-svelte-scan-*`, ignore attribute `data-svelte-scan-ignore`, HMR event
  `svelte-scan:server-log`. `type` not `interface` for object types.

## Read before you touch

Nothing here loads itself.

- [`architecture.md`](.claude/references/architecture.md): the three modules and every file in
  them.
