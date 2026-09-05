# Hierarchy prototype validation

Validated on 2026-09-05 against baseline `main` commit
`ae89605b042c15a1e64e5023b21f2d95fc8eb8a5`. This report accompanies the
[compatibility specification](hierarchy-compatibility.md); it does not claim
complete Inovua enterprise parity.

## Passing checks

| Check                              | Result                                                                                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn test:unit`                   | 78 tests passed, including tree processing and detail state/height tests.                                                                                                                                                                            |
| `yarn build`                       | Passed API audit, type tests, declaration generation, package builds, packed ESM/CommonJS loading, published types under NodeNext and Node10 resolution, CSS scope and optional entrypoint boundaries.                                               |
| `yarn build:site`                  | Passed. Existing bundle-size warnings remain.                                                                                                                                                                                                        |
| Focused hierarchy Playwright tests | 23 passed on the final implementation, covering desktop, mobile, controlled state, callbacks/vetoes, filtering, sorting, root pagination, remote arguments, static promises, natural row heights and virtual scrolling.                              |
| Broad Chromium regression run      | 450 passed with the two independently reproduced baseline failures below excluded. This run preceded the final tree-column ID/name regression addition; the final focused run covers that addition. Counts overlap and should not be added together. |
| `yarn test:e2e:performance`        | All 9 production checks passed, including 10,000-row filtering, sorting, selection and scrolling budgets. Also rebuilds the final example site.                                                                                                      |
| Focused ESLint                     | New hierarchy modules, demo and tests passed. Existing diagnostics in modified legacy files were compared with their unchanged baseline versions; no added diagnostics remain. Repository-wide lint is already failing on the baseline.              |

Reproduce the focused feature checks with:

```sh
PLAYWRIGHT_PORT=5187 yarn playwright test tests/playwright/hierarchy.spec.ts tests/playwright/hierarchy-regression.spec.ts --workers=2 --reporter=line
```

The screenshot test writes the four committed files under `docs/screenshots/`.
It captures the real demo at `/examples/hierarchy`: collapsed branches, a deep
filter match, an expanded panel containing another grid, and responsive cards.

## Baseline failures

The initial full browser run exposed a natural-row measurement regression in
this implementation. That regression was fixed by retaining TanStack's normal
measurement path when master-detail is disabled; its regression test then passed.
The following two remaining failures were rerun against unchanged `main` source
and reproduced there:

- `github-issues-33-48.spec.ts`: “GitHub issue #43: RTL mobile mode keeps custom
  scrolling and mirrored layout” — the scroll position assertion differs from
  the expected 360 pixels.
- `users-toolbar.spec.ts`: “external toolbar controls › exports the visible
  columns, honouring exportValue and exportWhenHidden” — times out waiting for
  the JSON download event.

The broad passing run excluded only those cases, with production-performance
tests run separately using their production configuration:

```sh
PLAYWRIGHT_PORT=5187 yarn playwright test --workers=4 --reporter=line --grep-invert 'RTL mobile mode keeps custom scrolling|exports the visible columns, honouring exportValue|@production-performance'
PLAYWRIGHT_PERFORMANCE_PORT=5192 yarn test:e2e:performance
```

## React compatibility matrix limitation

The standard `yarn test:react-compat` run reaches the React 16.8 fixture and
times out while opening a Radix menu. The same timeout reproduces with the
published `@geovi/the-datagrid@0.1.4`, independently of these changes.

Inspector evidence identified recursion in fixture dependency `nwsapi@2.2.27`
when jsdom evaluates top-layer selectors (`:modal` / `:fullscreen`). A temporary
fixture-only selector shim allowed the candidate's React 16.8 core, menu,
search, toolbar, collapsed-toolbar, combined and mobile runtime compositions to
pass. This is diagnostic evidence, not a passing standard compatibility matrix.
The repository compatibility script and runtime source were not patched for
the workaround; later React versions were not reached by the standard run.
