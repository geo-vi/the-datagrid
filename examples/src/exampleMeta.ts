import actionsExampleSource from "./ActionsGridExample.tsx?raw";
import basicExampleSource from "./BasicGridExample.tsx?raw";
import issue16CssScopeExampleSource from "./Issue16CssScopeExample.tsx?raw";
import issue17FixedContractExampleSource from "./Issue17FixedContractExample.tsx?raw";
import issue20HeightExampleSource from "./Issue20HeightExample.tsx?raw";
import issue21MissingImportsExampleSource from "./Issue21MissingImportsExample.tsx?raw";
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
  actions: actionsExampleSource,
  basic: basicExampleSource,
  "issue-16-css-scope": issue16CssScopeExampleSource,
  "issue-17": issue17FixedContractExampleSource,
  "issue-20-height": issue20HeightExampleSource,
  "issue-21-missing-imports": issue21MissingImportsExampleSource,
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
