import basicExampleSource from "./BasicGridExample.tsx?raw";
import issueFiveExampleSource from "./IssueFiveExample.tsx?raw";
import usersExampleSource from "./UsersGridExample.tsx?raw";

export type ExampleMeta = {
  to: "/basic" | "/issue-5" | "/users";
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
    to: "/basic",
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
    to: "/issue-5",
    label: "Issue #5",
    title: "Issue #5 reproduction",
    summary:
      "A focused regression case for the root element overflowing a fixed-width parent.",
    details:
      "The parent shell is intentionally narrower than the configured column widths so the overflow bug can be observed and tested in isolation.",
    sourcePath: "examples/src/IssueFiveExample.tsx",
    sourceCode: issueFiveExampleSource,
    tags: ["Regression", "Layout", "Overflow"],
  },
  {
    to: "/users",
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

export function getExampleMeta(
  route: ExampleMeta["to"]
): ExampleMeta | undefined {
  return examplePages.find((example) => example.to === route);
}
