export type ExampleId = "actions" | "basic" | "selection" | "users";

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
