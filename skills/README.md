# the-datagrid AI Skills

These skills are small, vendor-neutral instruction packs for AI coding agents
that need to generate or edit code using `@geovi/the-datagrid` without
hallucinating unsupported props or behavior.

They are written as `SKILL.md` files so they can be used directly with Codex,
but they are plain Markdown and can also be pasted into Claude, Cursor, Gemini,
Copilot chat, or any other prompt-based assistant.

Available skills:

- `skills/the-datagrid-consumer/SKILL.md`
  - Baseline guidance for rendering `ReactDataGrid` correctly.
- `skills/the-datagrid-data-flow/SKILL.md`
  - Local vs remote `dataSource`, filtering, sorting, pagination, and
    selection-state patterns.
- `skills/the-datagrid-inovua-migration/SKILL.md`
  - Compatibility rules for teams migrating from Inovua.

How to use them:

- Codex:
  - Copy the relevant skill directory into your Codex skills folder, or attach
    the `SKILL.md` file to the task context.
- Claude Code:
  - Paste the relevant skill into the prompt, or fold its rules into a local
    `CLAUDE.md`.
- Other assistants:
  - Paste the relevant skill into the system or developer prompt before asking
    the model to generate grid code.

Source of truth:

- `AGENTS.md`
- `src/main.ts`
- `src/types.ts`
- `/docs/reference/reactdatagrid`
- `/docs/reference/icolumn`
- `/docs/guides/remote-data`
- `/docs/guides/selection`
- `/docs/migration/inovua-compat`

If an AI output conflicts with those files, the repo files win.
