import actionsExampleSource from "./ActionsGridExample.tsx?raw";
import basicExampleSource from "./BasicGridExample.tsx?raw";
import columnsExampleSource from "./ColumnsGridExample.tsx?raw";
import editingExampleSource from "./EditingGridExample.tsx?raw";
import inovuaParityExampleSource from "./InovuaParityCompatPage.tsx?raw";
import mobileTransformExampleSource from "./MobileTransformExample.tsx?raw";
import {
  exampleCatalog,
  type ExampleCatalogEntry,
  type ExampleId,
} from "./exampleCatalog";
import selectionExampleSource from "./SelectionGridExample.tsx?raw";
import stackedColumnsExampleSource from "./StackedColumnsExample.tsx?raw";
import toolbarExampleSource from "./ToolbarGridExample.tsx?raw";
import usersExampleSource from "./UsersGridExample.tsx?raw";

export type ExampleMeta = ExampleCatalogEntry & {
  sourceCode: string;
};

const sourceById: Record<ExampleId, string> = {
  actions: actionsExampleSource,
  basic: basicExampleSource,
  columns: columnsExampleSource,
  editing: editingExampleSource,
  "inovua-parity": inovuaParityExampleSource,
  "mobile-transform": mobileTransformExampleSource,
  selection: selectionExampleSource,
  "stacked-columns": stackedColumnsExampleSource,
  toolbar: toolbarExampleSource,
  users: usersExampleSource,
};

export const examplePages: ExampleMeta[] = exampleCatalog.map((example) => ({
  ...example,
  sourceCode: sourceById[example.id],
}));

export function getExampleMeta(id: ExampleId): ExampleMeta | undefined {
  return examplePages.find((example) => example.id === id);
}
