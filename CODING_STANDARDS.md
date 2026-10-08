# Coding standards

<!-- vibekit:coding-standards:start -->
<!-- Generated from vibe-kit/ai-doc/references/coding-standards.md. -->

Read only the rows that match the files or operation in this task. The linked rules are materialized locally so this repository also works without the sibling kit checkout.

| Task | Read before acting |
| --- | --- |
| Source changes | [Comments](.claude/rules/comments.md), [root causes](.claude/rules/root-causes.md), [simplicity](.claude/rules/simplicity.md), [scope](.claude/rules/surgical-changes.md), [testing](.claude/rules/testing.md), [verification](.claude/rules/verification.md) |
| JS, TS or Svelte imports | [Imports](.claude/rules/imports.md) |
| Svelte components, routes or configuration | [Svelte](.claude/rules/svelte.md) |
| Swift, project.yml or Makefiles | [Swift](.claude/rules/swift.md) |
| Swift UI | [Liquid Glass](.claude/rules/liquid-glass.md) |
| Convex functions | [Convex](.claude/rules/convex.md) |
| Shared helpers, dependencies or app CSS | [Packages](.claude/rules/packages.md) |
| Shell commands | [Shell](.claude/rules/shell.md) |
| Git operations | [Shared working trees](.claude/rules/git-shared-tree.md) |
| Reader-facing copy | [Voice](.claude/rules/voice.md) and the repository's copy gate |

For repository-specific implementation or runtime operations, read **Repository conventions** below, if present. For design, integrations, product decisions or releases, follow the **Task references** for that subject. Nested instruction files add local exceptions.

<!-- vibekit:coding-standards:end -->

## Repository conventions

```bash
npx vitest run             # all tests
npx vitest run src/expect  # one module
```

- Everything the package emits is namespaced: CSS classes `sv-*`, CSS variables `--sv-*`, data
  attributes `data-svelte-scan-*`, ignore attribute `data-svelte-scan-ignore`, HMR event
  `svelte-scan:server-log`. `type` not `interface` for object types.


- [`architecture.md`](.claude/references/architecture.md): the three modules and every file in
  them.
