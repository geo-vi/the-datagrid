import * as React from "react";

import type { TypeDataGridProps, TypeLoadMaskProps } from "../../types";
import type { LoadingStore } from "../utils/loadingStore";

export type GridLoadingLayerProps = {
  controlledLoading: boolean | undefined;
  loadingText: React.ReactNode | (() => React.ReactNode);
  onLoadingChange: ((loading: boolean) => void) | undefined;
  renderLoadMask: TypeDataGridProps["renderLoadMask"];
  store: LoadingStore;
  surfaceRef: React.MutableRefObject<HTMLElement | null>;
  theme: string;
};

export const GridLoadingLayer = React.memo(function GridLoadingLayer(
  props: GridLoadingLayerProps
): React.ReactElement | null {
  const {
    controlledLoading,
    loadingText,
    onLoadingChange,
    renderLoadMask,
    store,
    surfaceRef,
    theme,
  } = props;
  const [, forceRender] = React.useState(0);
  const loading = store.getEffective(controlledLoading);
  const previousLoadingRef = React.useRef(false);

  React.useLayoutEffect(
    () => store.subscribe(() => forceRender((revision) => revision + 1)),
    [store]
  );
  React.useLayoutEffect(() => {
    surfaceRef.current?.setAttribute("aria-busy", String(loading));
  }, [loading, surfaceRef]);
  React.useEffect(() => {
    if (Object.is(previousLoadingRef.current, loading)) return;

    previousLoadingRef.current = loading;
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const loadMaskProps: TypeLoadMaskProps = {
    visible: loading,
    livePagination: false,
    loadingText,
    zIndex: 10000,
    theme,
  };
  const customLoadMask = renderLoadMask?.(loadMaskProps);

  if (customLoadMask !== undefined) {
    return <>{customLoadMask}</>;
  }
  if (!loading) return null;

  return (
    <div
      className="tdg-load-mask absolute inset-0 flex items-center justify-center bg-background/75 text-sm text-muted-foreground backdrop-blur-[1px]"
      style={{ zIndex: loadMaskProps.zIndex }}
      role="status"
      aria-live="polite"
      data-slot="grid-load-mask"
    >
      {typeof loadingText === "function" ? loadingText() : loadingText}
    </div>
  );
});
