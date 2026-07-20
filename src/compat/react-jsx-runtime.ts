import * as React from "react";

type ElementType = React.ElementType;
type ElementProps = Record<string, unknown> | null;

function withKey(
  props: ElementProps,
  key: React.Key | undefined
): ElementProps {
  if (key === undefined) return props;
  return { ...props, key };
}

/**
 * Compatibility runtime for dependencies compiled with the automatic JSX
 * transform. React only published `react/jsx-runtime` starting in 16.14,
 * while the grid supports React 16.8 and newer.
 */
export const Fragment = React.Fragment;

export function jsx(
  type: ElementType,
  props: ElementProps,
  key?: React.Key
): React.ReactElement {
  return React.createElement(type, withKey(props, key));
}

export function jsxs(
  type: ElementType,
  props: ElementProps,
  key?: React.Key
): React.ReactElement {
  const elementProps = withKey(props, key);
  if (!elementProps || !Array.isArray(elementProps.children)) {
    return React.createElement(type, elementProps);
  }

  const { children, ...propsWithoutChildren } = elementProps;
  return React.createElement(type, propsWithoutChildren, ...children);
}

export function jsxDEV(
  type: ElementType,
  props: ElementProps,
  key?: React.Key,
  isStaticChildren = false
): React.ReactElement {
  return isStaticChildren ? jsxs(type, props, key) : jsx(type, props, key);
}
