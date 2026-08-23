export type ExampleId =
  | "actions"
  | "basic"
  | "columns"
  | "inovua-parity"
  | "mobile-transform"
  | "selection"
  | "stacked-columns"
  | "toolbar"
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
      "A focused actions grid with a right-locked action column, controlled checkbox selection, and bulk mutations.",
    details:
      'Shows Inovua-style locked: "end" geometry across the header, filter row, virtualized body, resizing, and controlled ordering while row and bulk actions mutate the same grid state.',
    sourcePath: "examples/src/ActionsGridExample.tsx",
    tags: ["Actions", "Locked columns", "Virtualized"],
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
    id: "stacked-columns",
    to: "/examples/stacked-columns",
    legacyTo: "/stacked-columns",
    label: "Stacked columns",
    title: "Stacked and nested columns",
    summary:
      "Nested Inovua-style column groups that stay coherent while users filter, sort, resize, reorder, hide, and horizontally virtualize columns.",
    details:
      "Exercises root groups, nested groups, static and custom headers, automatic split/rejoin behavior, controlled column-order ownership, proportional group resizing, and a wide virtualized grid.",
    sourcePath: "examples/src/StackedColumnsExample.tsx",
    tags: ["Stacked columns", "Inovua", "Reordering", "Virtualized"],
  },
  {
    id: "toolbar",
    to: "/examples/toolbar",
    legacyTo: "/toolbar",
    label: "Toolbar",
    title: "Toolbar playground",
    summary:
      "An interactive playground for the optional RDGToolbar: inline or dropdown column toggles, export, filter-row and clear-filter actions.",
    details:
      "Switch each built-in action on or off, collapse column visibility into one dropdown, choose whether the export writes the current view or the whole data source, pick its formats, and hand filter-row ownership back to the grid to see the toggle disable itself. Columns show exportValue, exportWhenHidden, and exportable. A second grid is driven entirely from buttons outside its provider, through the apiRef the provider fills in.",
    sourcePath: "examples/src/ToolbarGridExample.tsx",
    tags: ["Toolbar", "Export", "Columns", "Filtering", "apiRef"],
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
