import type { DocsNavGroupKey, DocsPage } from "./docsContent";
import { getDocsPage } from "./docsContent";

export type DocsNavigationItem = {
  group: DocsNavGroupKey;
  slug: string;
  label: string;
  page: DocsPage;
};

export type DocsNavigationSection = {
  id:
    | "getting-started"
    | "data-sources"
    | "core-features"
    | "styling-localization"
    | "api-reference"
    | "components"
    | "compatibility"
    | "ai-tooling";
  label: string;
  items: DocsNavigationItem[];
};

function navigationItem(
  group: DocsNavGroupKey,
  slug: string,
  label: string
): DocsNavigationItem {
  const page = getDocsPage(group, slug);

  if (!page) {
    throw new Error(`Missing documentation page: ${group}/${slug}`);
  }

  return { group, slug, label, page };
}

/**
 * Display-oriented documentation taxonomy.
 *
 * Route groups remain stable URLs; this structure organizes those pages by the
 * task a reader is trying to complete instead of by document format.
 */
export const docsNavigationSections: DocsNavigationSection[] = [
  {
    id: "getting-started",
    label: "Getting started",
    items: [
      navigationItem("getting-started", "installation", "Installation"),
      navigationItem("getting-started", "quickstart", "Quickstart"),
      navigationItem("reference", "implemented-surface", "Feature overview"),
    ],
  },
  {
    id: "data-sources",
    label: "Data sources",
    items: [
      navigationItem("guides", "local-data", "Local data"),
      navigationItem("guides", "remote-data", "Remote data"),
      navigationItem("guides", "table-search", "Table search"),
    ],
  },
  {
    id: "core-features",
    label: "Core features",
    items: [
      navigationItem("guides", "filtering-and-sorting", "Filtering & sorting"),
      navigationItem("guides", "selection", "Selection"),
      navigationItem("guides", "locked-columns", "Locked columns & actions"),
    ],
  },
  {
    id: "styling-localization",
    label: "Styling & localization",
    items: [
      navigationItem("getting-started", "styling", "Styling & themes"),
      navigationItem("reference", "i18n", "Localization (i18n)"),
    ],
  },
  {
    id: "api-reference",
    label: "API reference",
    items: [
      navigationItem("reference", "reactdatagrid", "ReactDataGrid props"),
      navigationItem("reference", "icolumn", "IColumn API"),
      navigationItem("reference", "types", "Core types"),
    ],
  },
  {
    id: "components",
    label: "Components",
    items: [
      navigationItem(
        "reference",
        "providers-and-targets",
        "Providers & targets"
      ),
      navigationItem("reference", "date-filter", "Date filter"),
      navigationItem("reference", "number-filter", "Number filter"),
      navigationItem("reference", "select-filter", "Select filter"),
      navigationItem("reference", "text-input", "Text input"),
      navigationItem(
        "reference",
        "column-visibility-toolbar",
        "Column visibility toolbar"
      ),
      navigationItem("reference", "checkbox", "Checkbox"),
    ],
  },
  {
    id: "compatibility",
    label: "Compatibility",
    items: [
      navigationItem("migration", "inovua-compat", "Compatibility contract"),
      navigationItem("migration", "inovua-status", "Compatibility status"),
    ],
  },
  {
    id: "ai-tooling",
    label: "AI tooling",
    items: [navigationItem("guides", "ai-skills", "AI assistant skills")],
  },
];

export function getActiveDocsNavigationItem(
  pathname: string
): DocsNavigationItem | undefined {
  return docsNavigationSections
    .flatMap((section) => section.items)
    .find((item) => pathname === `/docs/${item.page.group}/${item.page.slug}`);
}
