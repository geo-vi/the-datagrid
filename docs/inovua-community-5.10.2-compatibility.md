# Inovua Community 5.10.2 compatibility ledger

This document is the release-gate ledger for the public Community contract of
`@inovua/reactdatagrid-community@5.10.2`. Enterprise-only grouping, pivot,
tree, detail, locked-row, row-reorder, row-resize, live-pagination, clipboard,
and license-key features are outside this gate.

The compatibility inventory is machine-readable in
[`community-api-manifest.json`](../community-api-manifest.json). Unknown
computed API names are absent rather than fabricated as successful no-ops.

## Completed work

| Issue | Community contract                                    | Executable evidence                                             |
| ----- | ----------------------------------------------------- | --------------------------------------------------------------- |
| #17   | row height, resize, flex, zebra, core edit, row style | `inovua-pending-parity.spec.ts`, `github-issues-17-32.spec.ts`  |
| #31   | defaults, instantiation types, React 16.8–19          | type tests, `test-react-compat.mjs`                             |
| #32   | Promise/function sources, loading, pagination         | `issue-32-data-source.spec.ts`                                  |
| #33   | controlled and multi-column sorting                   | `issue-33-sorting.spec.ts`                                      |
| #34   | filter inference, aliases, editors, operators         | `issue-34-filtering.spec.ts`                                    |
| #35   | column state, visibility, ordering, resize ownership  | `issue-35-column-state.spec.ts`                                 |
| #36   | stacked and nested headers                            | `issue-36-stacked-columns.spec.ts`                              |
| #37   | column, filter, and row context menus                 | `github-issues-33-48.spec.ts`                                   |
| #38   | active row, row selection, keyboard navigation        | `github-issues-33-48.spec.ts`                                   |
| #39   | cell selection and active-cell navigation             | `github-issues-33-48.spec.ts`                                   |
| #40   | row/cell/header customization, events, spans          | `github-issues-33-48.spec.ts`                                   |
| #41   | advanced inline-edit extension points                 | `github-issues-33-48.spec.ts`, `type-issue-41-editing.ts`       |
| #42   | per-row height maps and callbacks                     | `github-issues-33-48.spec.ts`, `type-issue-42-row-heights.ts`   |
| #43   | custom/native scrolling, keyboard scrolling, RTL      | `github-issues-33-48.spec.ts`, production performance suite     |
| #44   | editor/filter entries, ESM/CJS, CSS themes, license   | browser package probe, packed NodeNext/Node10/CJS/ESM consumers |
| #45   | explicit computed API and executable plugins          | manifest-backed browser contract probe                          |

## Release evidence

The release candidate must pass:

```sh
yarn build
yarn test:react-compat
yarn playwright test
yarn playwright test --config playwright.performance.config.ts
```

`yarn build` packs the actual tarball and verifies:

- ESM and CommonJS runtime entrypoints;
- NodeNext and Node10 declaration resolution;
- root, editor, filter, and documented type-module imports;
- base, default, amber, blue, green, and pink theme stylesheet paths;
- LICENSE, third-party attribution, and API manifest inclusion.

The browser release gate in `github-issues-33-48.spec.ts` traverses every
Community child issue from #31 through #45. A future discovered mismatch is a
compatibility regression and must be tracked with executable evidence; it does
not reinstate fabricated placeholder methods.
