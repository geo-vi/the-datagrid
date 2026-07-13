export type ExampleId =
  | "actions"
  | "basic"
  | "columns"
  | "inovua-parity"
  | "mobile-transform"
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
      "Shows the optional RDGSearchBar and RDGSearchProvider entry alongside local data, sorting, filtering, virtualization, column menus, and theme switching.",
    sourcePath: "examples/src/BasicGridExample.tsx",
    tags: ["Smoke", "Search", "Filtering", "Virtualized"],
  },
  {
    id: "columns",
    to: "/examples/columns",
    legacyTo: "/columns",
    label: "Columns",
    title: "Columns example",
    summary:
      "A production-style work queue built to showcase column configuration in one focused grid.",
    details:
      "Combines typed renderers, filter metadata, bounded widths, numeric alignment, hidden fields, controlled reordering, and virtualization.",
    sourcePath: "examples/src/ColumnsGridExample.tsx",
    tags: ["Columns", "Rendering", "Filtering", "Virtualized"],
  },
  {
    id: "inovua-parity",
    to: "/examples/inovua-parity",
    legacyTo: "/inovua-parity",
    label: "Compatibility lab",
    title: "Inovua backwards-compatibility lab",
    summary:
      "An interactive checklist for the row sizing, column sizing, appearance, and editing contracts carried forward from Inovua Community 5.10.2.",
    details:
      "Switch between focused, isolated checkpoints, follow the manual test prompt, inspect callback payloads and virtual measurements, and share a direct URL for any scenario.",
    sourcePath: "examples/src/InovuaParityCompatPage.tsx",
    tags: ["Inovua", "Compatibility", "Editing", "Sizing"],
  },
  {
    id: "mobile-transform",
    to: "/examples/mobile-transform",
    legacyTo: "/mobile-transform",
    label: "Mobile transform",
    title: "Responsive mobile virtual list",
    summary:
      "A 10,000-row grid that becomes searchable responsive cards on phones and tablets.",
    details:
      "Exercises mixed text, identifiers, numbers, status icons, long notes, and interactive row actions while keeping only visible cards mounted.",
    sourcePath: "examples/src/MobileTransformExample.tsx",
    tags: ["Mobile", "Virtualized", "Search"],
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
