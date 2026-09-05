import type {
  TypeDataGridProps,
  TypeExpandedNodes,
  TypeExpandedRows,
  TypeRowDetailsInfo,
} from "@geovi/the-datagrid";

const expandedNodes: TypeExpandedNodes = { "engineering/platform": true };
const expandedRows: TypeExpandedRows = true;
export const hierarchyProps: TypeDataGridProps = {
  idProperty: "id",
  columns: [{ name: "name" }],
  dataSource: [],
  treeEnabled: true,
  treeColumn: "name",
  nodesProperty: "children",
  treeNestingSize: 22,
  expandedNodes,
  onExpandedNodesChange: ({ nodeProps, nodeExpanded, expandedNodes: next }) => {
    const depth: number = nodeProps.depth;
    const expanded: boolean = nodeExpanded;
    void [depth, expanded, next];
  },
  expandedRows,
  enableRowExpand: true,
  collapsedRows: { excluded: true },
  rowExpandHeight: ({ data }) => data.height,
  renderRowDetails: (info: TypeRowDetailsInfo) => String(info.id),
  onRowExpand: ({ id }) => id !== "locked",
};
