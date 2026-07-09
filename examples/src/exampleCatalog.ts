export type ExampleId =
  | "actions"
  | "basic"
  | "issue-16-css-scope"
  | "issue-17"
  | "issue-20-height"
  | "issue-21-missing-imports"
  | "selection"
  | "users";

export type ExampleCatalogEntry = {
  id: ExampleId;
  to: `/examples/${ExampleId}`;
  legacyTo: `/${ExampleId}`;
  label: string;
  title: string;
  summary: string;
  details: string;
  sourcePath: string;
  tags: string[];
};

export const exampleCatalog: ExampleCatalogEntry[] = [
  {
    id: "actions",
    to: "/examples/actions",
    legacyTo: "/actions",
    label: "Actions",
    title: "Actions example",
    summary:
      "A focused actions grid that exercises row buttons, controlled checkbox selection, and bulk mutations.",
    details:
      "Shows semantic cell actions that mutate the current row, plus insert and delete-selected controls wired against the same grid state the issue used.",
    sourcePath: "examples/src/ActionsGridExample.tsx",
    tags: ["Actions", "Selection", "Mutation"],
  },
  {
    id: "basic",
    to: "/examples/basic",
    legacyTo: "/basic",
    label: "Basic",
    title: "Basic example",
    summary: "The compact baseline grid used by the visual regression suite.",
    details:
      "Covers the default grid surface: local data, sorting, filtering, virtualization, column menus, and theme switching.",
    sourcePath: "examples/src/BasicGridExample.tsx",
    tags: ["Smoke", "Filtering", "Virtualized"],
  },
  {
    id: "issue-16-css-scope",
    to: "/examples/issue-16-css-scope",
    legacyTo: "/issue-16-css-scope",
    label: "Issue 16",
    title: "Issue 16 CSS scope example",
    summary:
      "A host shadcn utility probe rendered beside the grid with conflicting datagrid token values.",
    details:
      "Reproduces the CSS bundle leak shape by keeping rounded-md, border-border, bg-background, and text-foreground outside .tdg-root.",
    sourcePath: "examples/src/Issue16CssScopeExample.tsx",
    tags: ["CSS", "Scope", "Regression"],
  },
  {
    id: "issue-17",
    to: "/examples/issue-17",
    legacyTo: "/issue-17",
    label: "Issue 17",
    title: "Issue 17 fixed-prop alternatives",
    summary:
      "A focused compatibility example for the missing-props report that keeps the root grid prop surface fixed.",
    details:
      "Shows empty-state copy through i18n.noRecords and column-level alternatives for rendering, alignment, sizing, and visibility without adding new ReactDataGrid props.",
    sourcePath: "examples/src/Issue17FixedContractExample.tsx",
    tags: ["Compatibility", "Types", "Columns"],
  },
  {
    id: "issue-20-height",
    to: "/examples/issue-20-height",
    legacyTo: "/issue-20-height",
    label: "Issue 20",
    title: "Issue 20 height example",
    summary:
      "A virtualized grid rendered in constrained and expanded parent heights.",
    details:
      "Exposes the layout regression where a fixed scroll viewport height clips a short parent and leaves unused space in a tall parent.",
    sourcePath: "examples/src/Issue20HeightExample.tsx",
    tags: ["Layout", "Virtualized", "Regression"],
  },
  {
    id: "issue-21-missing-imports",
    to: "/examples/issue-21-missing-imports",
    legacyTo: "/issue-21-missing-imports",
    label: "Issue 21",
    title: "Issue 21 export example",
    summary:
      "A package-entry import check for filter types and render cell props.",
    details:
      "Uses exported filter type definitions to configure filter metadata and typed CellProps in column render functions.",
    sourcePath: "examples/src/Issue21MissingImportsExample.tsx",
    tags: ["Exports", "Filtering", "Types"],
  },
  {
    id: "selection",
    to: "/examples/selection",
    legacyTo: "/selection",
    label: "Selection",
    title: "Selection example",
    summary:
      "A customer review queue that keeps checkbox selection, filtering, and Inovua-style external state in sync.",
    details:
      "Shows a realistic account list with health, ARR, owners, and renewal timing, along with a compact checkbox column and direct setter wiring for onSelectionChange.",
    sourcePath: "examples/src/SelectionGridExample.tsx",
    tags: ["Selection", "Accounts", "Filtering"],
  },
  {
    id: "users",
    to: "/examples/users",
    legacyTo: "/users",
    label: "Users",
    title: "Users-style example",
    summary:
      "An app-like integration with column toggles, exports, row actions, and mixed filter editors.",
    details:
      "Shows how the grid behaves in a fuller product-style screen with optional columns, derived toolbars, and richer renderers.",
    sourcePath: "examples/src/UsersGridExample.tsx",
    tags: ["Integration", "Toolbar", "Actions"],
  },
];
