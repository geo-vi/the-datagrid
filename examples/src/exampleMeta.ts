import basicExampleSource from "./BasicGridExample.tsx?raw";
import selectionExampleSource from "./SelectionGridExample.tsx?raw";
import usersExampleSource from "./UsersGridExample.tsx?raw";

export type ExampleId = "basic" | "selection" | "users";

export type ExampleMeta = {
  id: ExampleId;
  to: `/examples/${ExampleId}`;
  legacyTo: `/${ExampleId}`;
  label: string;
  title: string;
  summary: string;
  details: string;
  sourcePath: string;
  sourceCode: string;
  tags: string[];
};

export const examplePages: ExampleMeta[] = [
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
    sourceCode: basicExampleSource,
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
    sourceCode: selectionExampleSource,
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
    sourceCode: usersExampleSource,
    tags: ["Integration", "Toolbar", "Actions"],
  },
];

export function getExampleMeta(id: ExampleId): ExampleMeta | undefined {
  return examplePages.find((example) => example.id === id);
}
