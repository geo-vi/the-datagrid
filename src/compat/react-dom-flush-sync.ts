import * as ReactDOMNamespace from "the-datagrid:react-dom-external";

type ReactDOMModule = typeof import("react-dom");
type ReactDOMWithFlushSync = ReactDOMModule & {
  flushSync?: <T>(callback: () => T) => T;
};

const namespaceWithDefault = ReactDOMNamespace as unknown as {
  default?: ReactDOMModule;
};
const ReactDOM = (namespaceWithDefault.default ??
  ReactDOMNamespace) as ReactDOMWithFlushSync;

export const createPortal = ReactDOM.createPortal;
export const flushSync =
  ReactDOM.flushSync ?? (<T>(callback: () => T): T => callback());

export default ReactDOM;
