import ReactDataGrid, {
  ReactDataGrid as NamedReactDataGrid,
  type TypeDataGridProps,
  type TypeFilterTypes,
} from "@geovi/the-datagrid";

const defaultExportDefaults = ReactDataGrid.defaultProps;
const namedExportDefaults = NamedReactDataGrid.defaultProps;

const defaultPropsShape: Partial<TypeDataGridProps> = defaultExportDefaults;
const defaultFilterTypes: TypeFilterTypes = defaultExportDefaults.filterTypes;
const namedFilterTypes: TypeFilterTypes = namedExportDefaults.filterTypes;

export const defaultPropsCompat = {
  defaultPropsShape,
  defaultFilterTypes,
  namedFilterTypes,
  stringOperatorCount: defaultFilterTypes.string.operators.length,
};
