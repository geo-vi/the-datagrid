import { Children, isValidElement, type ReactNode } from "react";

import { exampleCatalog } from "../exampleCatalog";
import {
  getAllDocsPages,
  getDocsPageHref,
  getReferenceRowId,
  type DocsPage,
} from "../docs/docsContent";

export type SearchDocument = {
  title: string;
  category: string;
  href: string;
  body: string;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTextFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join(" ");
  }

  if (!isValidElement(node)) {
    return "";
  }

  const props = node.props as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof props.title === "string") {
    parts.push(props.title);
  }

  if (typeof props.code === "string") {
    parts.push(props.code);
  }

  if (typeof props.placeholder === "string") {
    parts.push(props.placeholder);
  }

  parts.push(
    Children.toArray(props.children as ReactNode)
      .map(extractTextFromNode)
      .join(" ")
  );

  return parts.join(" ");
}

function buildDocsBody(page: DocsPage): string {
  const sectionText = page.sections
    .map((section) => {
      const rowText =
        section.rows?.map((row) =>
          [row.name, row.type, row.defaultValue, row.description].join(" ")
        ) ?? [];

      return [
        section.id,
        section.title,
        ...rowText,
        extractTextFromNode(section.body),
      ].join(" ");
    })
    .join(" ");

  return collapseWhitespace(
    [
      page.title,
      page.summary,
      page.description,
      page.group,
      ...page.tags,
      sectionText,
    ].join(" ")
  );
}

function buildSectionBody(page: DocsPage, sectionIndex: number): string {
  const section = page.sections[sectionIndex];

  if (!section) {
    return "";
  }

  const sectionText = section.rows
    ?.map((row) =>
      [row.name, row.type, row.defaultValue, row.description].join(" ")
    )
    .join(" ");

  return collapseWhitespace(
    [
      page.title,
      page.summary,
      page.description,
      page.group,
      ...page.tags,
      section.id,
      section.title,
      sectionText,
      extractTextFromNode(section.body),
    ].join(" ")
  );
}

export function buildDocsSearchDocuments(): SearchDocument[] {
  const documents: SearchDocument[] = [];

  for (const page of getAllDocsPages()) {
    const pageHref = getDocsPageHref(page);

    documents.push({
      title: page.title,
      category: page.group,
      href: pageHref,
      body: buildDocsBody(page),
    });

    for (const section of page.sections) {
      const sectionHref = `${pageHref}#${section.id}`;

      documents.push({
        title: `${page.title} · ${section.title}`,
        category: `${page.group} / section`,
        href: sectionHref,
        body: buildSectionBody(page, page.sections.indexOf(section)),
      });

      for (const row of section.rows ?? []) {
        documents.push({
          title: `${page.title} · ${row.name}`,
          category: `${page.group} / key`,
          href: `${pageHref}#${getReferenceRowId(section.id, row.name)}`,
          body: collapseWhitespace(
            [
              page.title,
              page.summary,
              page.description,
              page.group,
              ...page.tags,
              section.title,
              row.name,
              row.type,
              row.defaultValue,
              row.description,
            ].join(" ")
          ),
        });
      }
    }
  }

  return documents;
}

export function buildExampleSearchDocuments(
  sourceByPath: Record<string, string>
): SearchDocument[] {
  return exampleCatalog.map((example) => ({
    title: example.title,
    category: "examples",
    href: example.to,
    body: collapseWhitespace(
      [
        example.label,
        example.title,
        example.summary,
        example.details,
        example.sourcePath,
        ...example.tags,
        sourceByPath[example.sourcePath] ?? "",
      ].join(" ")
    ),
  }));
}

export function buildGlobalSearchDocuments(
  sourceByPath: Record<string, string>
): SearchDocument[] {
  return [
    ...buildDocsSearchDocuments(),
    ...buildExampleSearchDocuments(sourceByPath),
  ];
}
