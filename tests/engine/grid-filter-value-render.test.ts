import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ReactDataGrid from "../../src/grid/ReactDataGrid";
import type { TypeDataGridProps } from "../../src/types";

const columns = [
  { name: "id", header: "Id" },
  { name: "name", header: "Name" },
];

const render = (props: Partial<TypeDataGridProps>) =>
  renderToStaticMarkup(
    React.createElement(ReactDataGrid, {
      idProperty: "id",
      columns,
      dataSource: [{ id: 1, name: "Atlas" }],
      ...props,
    } as TypeDataGridProps)
  );

/**
 * A filter value is the consumer's and is typed `unknown`: a 64-bit id is a
 * BigInt, and an object can point back at itself. Nothing between the props
 * and the markup may walk into one, so nothing may serialize it either.
 */
test("a filter value the grid cannot serialize still renders", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;

  assert.doesNotThrow(() =>
    render({
      defaultFilterValue: [
        { name: "id", operator: "eq", type: "number", value: 1n },
        { name: "name", operator: "eq", type: "string", value: cyclic },
      ],
    })
  );
});
