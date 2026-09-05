import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  TypeMasterDetailProps,
  TypeRowDetailsInfo,
} from "../../src/grid/hierarchy/masterDetailTypes";
import {
  isMasterDetailEnabled,
  isMasterDetailExpandable,
  isMasterDetailExpanded,
  prepareMasterDetailToggle,
  resolveMasterDetailHeight,
  setMasterDetailExpanded,
  useMasterDetail,
  type MasterDetailState,
} from "../../src/grid/hierarchy/useMasterDetail";

const data = { id: 42, title: "Master", detailHeight: 260 };
const collapsed: MasterDetailState = { expandedRows: {}, collapsedRows: {} };

test("master-detail is opt-in and explicit disable overrides inferred enablement", () => {
  assert.equal(isMasterDetailEnabled({}), false);
  assert.equal(
    isMasterDetailEnabled({ renderRowDetails: () => "Details" }),
    false
  );
  assert.equal(isMasterDetailEnabled({ defaultExpandedRows: {} }), false);
  assert.equal(
    isMasterDetailEnabled({ renderDetailsGrid: () => "Nested grid" }),
    false
  );
  assert.equal(isMasterDetailEnabled({ expandedRows: true }), false);
  assert.equal(isMasterDetailEnabled({ enableRowExpand: true }), true);
  assert.equal(isMasterDetailEnabled({ rowExpandHeight: 200 }), false);
  assert.equal(
    isMasterDetailEnabled({ enableRowExpand: false, expandedRows: true }),
    false
  );
});

test("expand-all keeps collapse exceptions without mutating controlled maps", () => {
  const initial: MasterDetailState = {
    expandedRows: true,
    collapsedRows: Object.freeze({ earlier: true }),
  };
  assert.equal(isMasterDetailExpanded(initial, data.id), true);
  const next = setMasterDetailExpanded(initial, data.id, false);
  assert.equal(next.expandedRows, true);
  assert.deepEqual(next.collapsedRows, { earlier: true, 42: true });
  assert.deepEqual(initial.collapsedRows, { earlier: true });
  assert.equal(isMasterDetailExpanded(next, data.id), false);
  const reopened = setMasterDetailExpanded(next, data.id, true);
  assert.deepEqual(reopened, initial);
});

test("explicit expansion maps ignore collapse exceptions and preserve unrelated rows", () => {
  const initial: MasterDetailState = {
    expandedRows: Object.freeze({ earlier: true, 42: true }),
    collapsedRows: Object.freeze({ 42: true }),
  };
  assert.equal(isMasterDetailExpanded(initial, data.id), true);
  const next = setMasterDetailExpanded(initial, data.id, false);
  assert.deepEqual(next.expandedRows, { earlier: true });
  assert.equal(isMasterDetailExpanded(initial, data.id), true);
  assert.deepEqual(setMasterDetailExpanded(next, "later", true).expandedRows, {
    earlier: true,
    later: true,
  });
});

test("single expansion replaces the prior map and expand-all sentinel", () => {
  for (const expandedRows of [{ earlier: true }, true] as const) {
    const next = setMasterDetailExpanded(
      { expandedRows, collapsedRows: { 42: true } },
      data.id,
      true,
      false
    );
    assert.deepEqual(next, { expandedRows: { 42: true }, collapsedRows: {} });
    assert.equal(isMasterDetailExpanded(next, "earlier"), false);
    assert.equal(isMasterDetailExpanded(next, data.id), true);
  }
});

test("row IDs resembling object properties remain ordinary record IDs", () => {
  assert.equal(isMasterDetailExpanded(collapsed, "toString"), false);
  const expanded = setMasterDetailExpanded(collapsed, "__proto__", true);
  assert.equal(isMasterDetailExpanded(expanded, "__proto__"), true);
  assert.equal(Object.getPrototypeOf(expanded.expandedRows), Object.prototype);
  assert.equal(isMasterDetailExpanded(collapsed, "__proto__"), false);
});

test("unexpandableRows takes precedence over the predicate as in the archived API", () => {
  let calls = 0;
  const props: TypeMasterDetailProps = {
    enableRowExpand: true,
    isRowExpandable: () => {
      calls += 1;
      return false;
    },
  };
  assert.equal(isMasterDetailExpandable(props, data, data.id, 0), false);
  assert.equal(calls, 1);
  props.unexpandableRows = {};
  assert.equal(isMasterDetailExpandable(props, data, data.id, 0), true);
  props.unexpandableRows = { 42: true };
  assert.equal(isMasterDetailExpandable(props, data, data.id, 0), false);
  assert.equal(calls, 1);
});

test("legacy callbacks receive IDs and original data in order and can veto", () => {
  const events: unknown[] = [];
  const props: TypeMasterDetailProps = {
    enableRowExpand: true,
    onRowExpand: (info) => {
      events.push(["expand", info]);
    },
    onRowExpandChange: (info) => {
      events.push(["change", info]);
    },
  };
  const request = { props, state: collapsed, data, id: data.id, rowIndex: 3 };
  const result = prepareMasterDetailToggle(request);
  assert.ok(result);
  assert.equal(result.info.data, data);
  assert.deepEqual(events, [
    ["expand", { data, id: 42, index: 3 }],
    [
      "change",
      {
        data,
        id: 42,
        index: 3,
        rowExpanded: true,
        expandedRows: { 42: true },
        collapsedRows: {},
      },
    ],
  ]);
  assert.deepEqual(collapsed, { expandedRows: {}, collapsedRows: {} });
  events.length = 0;
  props.onRowExpand = () => false;
  assert.equal(prepareMasterDetailToggle(request), null);
  assert.deepEqual(events, []);
  props.onRowExpand = undefined;
  props.onRowExpandChange = () => false;
  assert.equal(prepareMasterDetailToggle(request), null);
  props.onRowCollapse = () => false;
  assert.equal(
    prepareMasterDetailToggle({ ...request, state: result.state }),
    null
  );
});

test("ineligible rows do not invoke expansion callbacks", () => {
  const result = prepareMasterDetailToggle({
    props: {
      enableRowExpand: true,
      isRowExpandable: () => false,
      onRowExpand: () => {
        throw new Error("Must not run");
      },
    },
    state: collapsed,
    data,
    id: data.id,
    rowIndex: 0,
  });
  assert.equal(result, null);
});

test("rowExpandHeight measures total height and safely bounds the detail remainder", () => {
  assert.equal(resolveMasterDetailHeight(undefined, data, 40), 40);
  assert.equal(resolveMasterDetailHeight(260, data, 52), 208);
  assert.equal(
    resolveMasterDetailHeight(({ data: row }) => row.detailHeight, data, 60),
    200
  );
  assert.equal(resolveMasterDetailHeight(30, data, 52), 0);
  assert.equal(resolveMasterDetailHeight(-10, data, 52), 0);
  assert.equal(resolveMasterDetailHeight(Number.NaN, data, 52), 28);
  assert.equal(
    resolveMasterDetailHeight(Number.POSITIVE_INFINITY, data, 52),
    28
  );
});

test("detail rendering receives legacy row metadata and controlled maps are authoritative", () => {
  const rows = [data];
  let received: TypeRowDetailsInfo | undefined;
  let markup = "";
  function Harness({ props }: { props: TypeMasterDetailProps }) {
    const detail = useMasterDetail({
      props,
      rows,
      getRowId: (row) => row.id,
      selectedMap: { 42: data },
      activeIndex: 0,
    });
    return React.createElement(
      React.Fragment,
      null,
      detail.renderToggle(data, 0),
      detail.renderDetails(data, 0)
    );
  }
  const props: TypeMasterDetailProps = {
    enableRowExpand: true,
    defaultExpandedRows: true,
    expandedRows: {},
    renderRowDetails: (info) => {
      received = info;
      return "Detail content";
    },
  };
  markup = renderToStaticMarkup(React.createElement(Harness, { props }));
  assert.match(markup, /aria-label="Expand row details"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.doesNotMatch(markup, /Detail content/);
  assert.equal(received, undefined);
  props.expandedRows = { 42: true };
  markup = renderToStaticMarkup(React.createElement(Harness, { props }));
  assert.match(markup, /aria-label="Collapse row details"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /Detail content/);
  assert.ok(received);
  assert.equal(received.id, 42);
  assert.equal(received.rowId, 42);
  assert.equal(received.data, data);
  assert.equal(received.dataSource, rows);
  assert.equal(received.rowSelected, true);
  assert.equal(received.rowActive, true);
  assert.equal(received.rowExpanded, true);
  assert.equal(received.rowIndex, 0);
  assert.equal(typeof received.toggleRowExpand, "function");
});

test("renderDetailsGrid enables legacy detail rendering and renderRowDetails takes precedence", () => {
  const received: { info: TypeRowDetailsInfo; detailsProps: object }[] = [];
  function Harness({ props }: { props: TypeMasterDetailProps }) {
    const detail = useMasterDetail({
      props,
      rows: [data],
      getRowId: (row) => row.id,
    });
    return React.createElement(
      React.Fragment,
      null,
      detail.renderToggle(data, 0),
      detail.renderDetails(data, 0)
    );
  }
  const props: TypeMasterDetailProps = {
    enableRowExpand: true,
    defaultExpandedRows: { 42: true },
    renderDetailsGrid: (info, detailsProps) => {
      received.push({ info, detailsProps });
      return "Nested grid content";
    },
  };
  const nested = renderToStaticMarkup(React.createElement(Harness, { props }));
  assert.match(nested, /Nested grid content/);
  assert.match(nested, /aria-expanded="true"/);
  assert.equal(received[0].info.data, data);
  assert.equal(received[0].info.id, 42);
  assert.deepEqual(received[0].detailsProps, {});
  const explicit = renderToStaticMarkup(
    React.createElement(Harness, {
      props: { ...props, renderRowDetails: () => "Explicit details" },
    })
  );
  assert.match(explicit, /Explicit details/);
  assert.doesNotMatch(explicit, /Nested grid content/);
  assert.equal(received.length, 1);
});
