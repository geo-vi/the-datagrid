import * as React from "react";

type UseId = () => string;

let nextLegacyId = 0;

function useLegacyStableId(prefix: string): string {
  const [id] = React.useState(() => {
    nextLegacyId += 1;
    return `${prefix}-${nextLegacyId}`;
  });

  return id;
}

const useStableIdImplementation: (prefix: string) => string =
  typeof (React as typeof React & { useId?: UseId }).useId === "function"
    ? (prefix) =>
        `${prefix}-${(React as typeof React & { useId: UseId }).useId()}`
    : useLegacyStableId;

/** Returns a component-stable ID on every supported React version. */
export function useStableId(prefix = "tdg"): string {
  return useStableIdImplementation(prefix);
}
