import type { TypeColumn } from "../types";

export type RDGColumnVisibilityPublishedSnapshot = {
  columns: readonly TypeColumn[];
  columnOrder: readonly string[];
  columnVisibilityMap: Readonly<Record<string, boolean>>;
  theme: string;
  setColumnVisible: (columnId: string, visible: boolean) => void;
};

/** Private bridge injected by RDGColumnVisibilityTarget. */
export type RDGColumnVisibilityController = {
  publish: (snapshot: RDGColumnVisibilityPublishedSnapshot) => void;
};
