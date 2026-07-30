export type TypeCommunityFilterValue<T = unknown> = {
  name?: string;
  operator?: string;
  type?: string;
  value?: T;
  emptyValue?: unknown;
  active?: boolean;
  filterEditorProps?: unknown;
  dataSource?: unknown[];
};

export type TypeCommunityFilterChange<T = unknown> = (
  filterValue: TypeCommunityFilterValue<T>
) => void;

export function withFilterEditorValue<T>(
  filterValue: TypeCommunityFilterValue<unknown> | undefined,
  value: T,
  fallbackType: string
): TypeCommunityFilterValue<T> {
  return {
    ...filterValue,
    type: filterValue?.type ?? fallbackType,
    value,
  };
}
