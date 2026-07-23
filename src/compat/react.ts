import * as ReactNamespace from "the-datagrid:react-external";

type ReactModule = typeof import("react");
type UseDeferredValue = <T>(value: T) => T;
type UseId = () => string;
type UseInsertionEffect = typeof ReactNamespace.useLayoutEffect;
type Use = (usable: unknown) => unknown;

const namespaceWithDefault = ReactNamespace as unknown as {
  default?: ReactModule;
};
const React = (namespaceWithDefault.default ?? ReactNamespace) as ReactModule;

// Re-export the React 16.8 surface used by the grid and its bundled
// dependencies. Reading through the normalized namespace avoids named ESM
// imports from React's CommonJS builds, which Node cannot provide on 16/17.
export const Children = React.Children;
export const Component = React.Component;
export const Fragment = React.Fragment;
export const PureComponent = React.PureComponent;
export const cloneElement = React.cloneElement;
export const createContext = React.createContext;
export const createElement = React.createElement;
export const createRef = React.createRef;
export const forwardRef = React.forwardRef;
export const isValidElement = React.isValidElement;
export const lazy = React.lazy;
export const memo = React.memo;
export const useCallback = React.useCallback;
export const useContext = React.useContext;
export const useDebugValue = React.useDebugValue;
export const useDeferredValue = (
  React as ReactModule & { useDeferredValue?: UseDeferredValue }
).useDeferredValue;
export const useEffect = React.useEffect;
export const useId = (React as ReactModule & { useId?: UseId }).useId;
export const useImperativeHandle = React.useImperativeHandle;
export const useInsertionEffect = (
  React as ReactModule & { useInsertionEffect?: UseInsertionEffect }
).useInsertionEffect;
export const useLayoutEffect = React.useLayoutEffect;
export const useMemo = React.useMemo;
export const useReducer = React.useReducer;
export const useRef = React.useRef;
export const useState = React.useState;
export const use = (React as ReactModule & { use?: Use }).use;
export const version = React.version;

export default React;
