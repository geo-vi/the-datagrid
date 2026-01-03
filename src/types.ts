/**
 * the-datagrid
 *
 * Compatibility-oriented type surface inspired by Inovua ReactDataGrid (MIT).
 * Goal: keep familiar type names/contracts while implementing our own runtime.
 */

import type * as React from 'react'

export type TypeDataSource =
  | unknown[]
  | Promise<unknown[]>
  | Promise<{ data: unknown[]; count: number }>
  | ((props: unknown) => unknown[])
  | ((props: unknown) => Promise<unknown[]>)
  | ((props: unknown) => Promise<{ data: unknown[]; count: number }>)

export type SortDirection = 1 | -1 | 0

export type TypeSingleSortInfo = {
  dir: SortDirection
  name: string
  id?: string
  type?: string
  fn?: (...args: unknown[]) => unknown
  columnName?: string
}

export type TypeSortInfo = TypeSingleSortInfo | TypeSingleSortInfo[] | null

export type TypeSingleFilterValue = {
  name: string
  type: string
  operator: string
  value: unknown
  emptyValue?: unknown
  fn?: (arg: unknown) => unknown
  getFilterValue?: (...args: unknown[]) => unknown
  active?: boolean
}

export type TypeFilterValue = TypeSingleFilterValue[] | null

export type TypeFilterOperator = {
  name: string
  fn: (args: {
    value: unknown
    filterValue: unknown
    emptyValue?: unknown
    data?: unknown
    column?: unknown
  }) => boolean
  filterOnEmptyValue?: boolean
  valueOnOperatorSelect?: unknown
  disableFilterEditor?: boolean
}

export type TypeFilterType = {
  type: string
  emptyValue: unknown
  operators: TypeFilterOperator[]
}

export type TypeFilterTypes = Record<string, TypeFilterType>

export interface IColumn {
  name?: string
  id?: string

  header?: React.ReactNode
  renderHeader?: (cellProps: unknown) => React.ReactNode

  render?: (
    value: unknown,
    args: {
      data: unknown
      rowIndex: number
      column: TypeColumn
      columnId: string
    }
  ) => React.ReactNode

  width?: number
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  flex?: number | null
  defaultFlex?: number | null

  visible?: boolean
  defaultVisible?: boolean
  hideable?: boolean
  draggable?: boolean

  sortable?: boolean
  sortName?: string

  filterable?: boolean
  filterType?: string
  filterName?: string
  filterEditor?: React.ComponentType<Record<string, unknown>>
  filterEditorProps?: unknown

  textAlign?: 'start' | 'end' | 'left' | 'right' | 'center'
  headerAlign?: 'start' | 'end' | 'left' | 'right' | 'center'

  className?: string
  style?: unknown
  headerProps?: { className?: string; style?: React.CSSProperties }

  [key: string]: unknown
}

export type TypeColumn = IColumn
export type TypeColumns = TypeColumn[]

export type TypeI18n = { [key: string]: string | React.ReactNode }

export type TypeRowSelection = string | number | boolean | { [key: string]: boolean } | null

export type TypeOnSelectionChangeArg = {
  selected: TypeRowSelection
  data?: unknown
  unselected?: TypeRowSelection
  originalData?: TypeDataSource
}

export type TypeComputedProps = {
  reload: () => void

  getData: () => unknown[]
  getCount: () => number

  getSkip: () => number
  getLimit: () => number
  setSkip: (skip: number) => void
  setLimit: (limit: number) => void

  getSortInfo: () => TypeSortInfo
  setSortInfo: (sortInfo: TypeSortInfo) => void

  getFilterValue: () => TypeFilterValue
  setFilterValue: (filterValue: TypeFilterValue) => void

  getColumnOrder: () => string[]
  setColumnOrder: (columnOrder: string[]) => void
}

export type TypePaginationMode = true | false | 'remote' | 'local'

export type TypeDataGridProps = {
  theme?: string
  idProperty: string

  columns: TypeColumns
  dataSource: TypeDataSource

  columnOrder?: string[]
  onColumnOrderChange?: (columnOrder: string[]) => void

  enableColumnFilterContextMenu?: boolean

  enableColumnAutosize?: boolean
  skipHeaderOnAutoSize?: boolean

  enableFiltering?: boolean
  filterValue?: TypeFilterValue
  defaultFilterValue?: TypeFilterValue
  onFilterValueChange?: (filterValue: TypeFilterValue) => void

  filterTypes?: TypeFilterTypes

  filteredRowsCount?: (filteredRows: number) => void

  sortInfo?: TypeSortInfo
  defaultSortInfo?: TypeSortInfo
  onSortInfoChange?: (sortInfo: TypeSortInfo) => void
  allowUnsort?: boolean
  defaultSortingDirection?: 'desc' | 'asc'

  pagination?: TypePaginationMode
  skip?: number
  defaultSkip?: number
  limit?: number
  defaultLimit?: number
  onSkipChange?: (skip: number) => void
  onLimitChange?: (limit: number) => void
  pageSizes?: number[]

  virtualized?: boolean

  columnUserSelect?: true | false | 'text' | 'none'

  i18n?: TypeI18n

  showColumnMenuTool?: boolean

  rowHeight?: number
  headerHeight?: number
  filterRowHeight?: number

  loading?: boolean

  checkboxColumn?: boolean | IColumn

  selected?: TypeRowSelection
  defaultSelected?: TypeRowSelection
  onSelectionChange?: (config: TypeOnSelectionChangeArg) => void

  onReady?: (
    computedPropsRef: React.MutableRefObject<TypeComputedProps | null>
  ) => void
  handle?: (gridApiRef: React.MutableRefObject<TypeComputedProps | null>) => void

  className?: string
  style?: React.CSSProperties
}
