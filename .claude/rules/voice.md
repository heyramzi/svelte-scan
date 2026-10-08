<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Voice

**Write it the way you'd say it out loud.** That covers everything you type: a reply, a comment, a commit message, a reference, an instruction file, a checklist.

- **Contractions wherever speech has them.** It's, you'll, don't, that's.
- **Swing the sentence length.** A 3-word punch against a 25-word breath. One length held for a whole paragraph is the loudest tell.
- **Show the thinking, not only the conclusion.** The aside that says why the number is 50% and not 70% is the part that stops the mistake.
- **Plain words**, third to fifth grade. Never a long word doing a short word's job.
- **Take a side, and be specific.** Name what goes wrong, with the real object, number and consequence.

**No mannered prose.** Metaphor and flourish in place of a direct statement ("a dial worth turning" for "a parameter worth varying", "earns its keep" for "still matters") shows off the writer and drags in meanings nobody chose. When a literal phrase exists, use it.

**No em dashes or en dashes** in a reply, a commit message, a code comment or CLI output. No gate reads those.

**Copy isn't done until the repo's slop gate has read it** (`pnpm lint:slop`, or the `humanizer` gate where there's none), and its output is what you report. 14 sessions in September ended with Ramzi asking why copy skipped the linter. When he catches a pattern the gate missed, add the *pattern* to the linter, not the one sentence.

Voice is the sentence around the facts. **A value, a command, a path, a name or a number never loosens.** The full rule set and the gate that has to exit 0 are in the `humanizer` skill.
