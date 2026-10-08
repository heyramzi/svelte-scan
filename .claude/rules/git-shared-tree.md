<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Git with parallel sessions

Several sessions work the same repos at once, and Ramzi commits, not you. That shapes every git command.

- **Don't `git stash pop` to get your own work back.** `pop` takes `stash@{0}`, and several Studio repos carry a stack of lint-staged backups, so it lays somebody else's tree over yours and leaves a conflicted merge. Name the entry.
- **Another session may stash your uncommitted work mid-turn**, so a file you just wrote reads as reverted and `git status` is clean. Take your paths back with `git checkout stash@{0} -- <paths>` and leave the entry for its owner.
- **Never stash somebody else's uncommitted file to test something.** `stash push -- <path>`, then `checkout` and `drop`, leaves the file at HEAD and their work in a dangling commit you can only find by grepping `git fsck --unreachable`. Copy the file to the scratchpad and test there.
- **`git checkout HEAD -- <path>` deletes whatever is uncommitted in it.** On 7 Oct 2026 a rebase by plumbing ended with one, and another session's `package.json` edit only came back from a stray blob. Check `git status --porcelain -- <path>` first, and if it's dirty, three-way merge (`git merge-file`) instead. When asked to commit, `git commit --only -- <your paths>` leaves everyone else's staged work alone.
