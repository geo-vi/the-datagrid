import basicExampleSource from "./BasicGridExample.tsx?raw";
import {
  exampleCatalog,
  type ExampleCatalogEntry,
  type ExampleId,
} from "./exampleCatalog";
import selectionExampleSource from "./SelectionGridExample.tsx?raw";
import usersExampleSource from "./UsersGridExample.tsx?raw";

export type ExampleMeta = ExampleCatalogEntry & {
  sourceCode: string;
};

const sourceById: Record<ExampleId, string> = {
  basic: basicExampleSource,
  selection: selectionExampleSource,
  users: usersExampleSource,
};

export const examplePages: ExampleMeta[] = exampleCatalog.map((example) => ({
  ...example,
  sourceCode: sourceById[example.id],
}));

export function getExampleMeta(id: ExampleId): ExampleMeta | undefined {
  return examplePages.find((example) => example.id === id);
}
