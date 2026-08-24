import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const expectedReactVersion = process.env.TDG_REACT_VERSION;

assert.ok(expectedReactVersion, "TDG_REACT_VERSION must be provided");
assert.doesNotThrow(
  () => require.resolve("use-sync-external-store/shim"),
  "the packed grid must install its React 16-compatible external-store shim"
);

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});
const { window } = dom;

function exposeGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

for (const name of [
  "window",
  "document",
  "navigator",
  "Node",
  "NodeFilter",
  "Element",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "MutationObserver",
  "DOMRect",
  "getComputedStyle",
]) {
  exposeGlobal(name, name === "window" ? window : window[name]);
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

exposeGlobal("ResizeObserver", ResizeObserverStub);
window.ResizeObserver = ResizeObserverStub;
window.PointerEvent = window.MouseEvent;
exposeGlobal("PointerEvent", window.PointerEvent);

const requestAnimationFrame = (callback) =>
  setTimeout(() => callback(Date.now()), 0);
const cancelAnimationFrame = (handle) => clearTimeout(handle);
window.requestAnimationFrame = requestAnimationFrame;
window.cancelAnimationFrame = cancelAnimationFrame;
exposeGlobal("requestAnimationFrame", requestAnimationFrame);
exposeGlobal("cancelAnimationFrame", cancelAnimationFrame);

window.matchMedia = (query) => ({
  matches: query.includes("max-width: 1024px"),
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return true;
  },
});

window.HTMLElement.prototype.scrollTo = function scrollTo() {};
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
window.HTMLElement.prototype.hasPointerCapture = function hasPointerCapture() {
  return false;
};
window.HTMLElement.prototype.setPointerCapture =
  function setPointerCapture() {};
window.HTMLElement.prototype.releasePointerCapture =
  function releasePointerCapture() {};
window.HTMLElement.prototype.getBoundingClientRect =
  function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      right: 800,
      bottom: 400,
      left: 0,
      width: 800,
      height: 400,
      toJSON() {
        return this;
      },
    };
  };

for (const [property, value] of [
  ["clientWidth", 800],
  ["clientHeight", 400],
  ["offsetWidth", 800],
  ["offsetHeight", 400],
]) {
  Object.defineProperty(window.HTMLElement.prototype, property, {
    configurable: true,
    get: () => value,
  });
}

const windowErrors = [];
window.addEventListener("error", (event) => {
  windowErrors.push(event.error ?? new Error(event.message));
});

const React = require("react");
const ReactDOM = require("react-dom");
const ReactDOMServer = require("react-dom/server");
const core = await import("@geovi/the-datagrid");
const search = await import("@geovi/the-datagrid/search");
const toolbarEntry = await import("@geovi/the-datagrid/toolbar");
const components = await import("@geovi/the-datagrid/components");

assert.ok(
  React.version === expectedReactVersion ||
    React.version.startsWith(`${expectedReactVersion}-`),
  `the fixture must execute against React ${expectedReactVersion}, received ${React.version}`
);

const ReactDataGrid = core.default;
const columns = [
  { name: "id", header: "ID", width: 90 },
  {
    name: "name",
    header: "Name",
    defaultFlex: 1,
    filterable: true,
    hideable: true,
  },
];
const rows = [
  { id: "row-1", name: "Ada Lovelace" },
  { id: "row-2", name: "Grace Hopper" },
];

function createGrid(overrides = {}) {
  return React.createElement(ReactDataGrid, {
    idProperty: "id",
    columns,
    dataSource: rows,
    enableFiltering: true,
    showColumnMenuTool: true,
    virtualized: false,
    style: { height: 320 },
    ...overrides,
  });
}

function createSearchComposition() {
  return React.createElement(search.RDGSearchProvider, {
    children: [
      React.createElement(search.RDGSearchBar, { key: "search" }),
      React.createElement(search.RDGSearchTarget, {
        key: "target",
        children: createGrid({ enableFiltering: false }),
      }),
    ],
  });
}

function createToolbarComposition() {
  return React.createElement(toolbarEntry.RDGToolbarProvider, {
    children: [
      React.createElement(toolbarEntry.RDGToolbar, {
        key: "toolbar",
        showExport: true,
        showFilterToggle: true,
        // jsdom's window is 1024px wide and `matchMedia` above answers
        // accordingly, so the toolbar would collapse its toggles into the
        // dropdown and this composition would have no inline buttons to check.
        // The dropdown gets its own composition below.
        disableMobileAutoToolbarCollapsedColumns: true,
      }),
      React.createElement(toolbarEntry.RDGToolbarTarget, {
        key: "target",
        children: createGrid({ enableFiltering: false }),
      }),
    ],
  });
}

function createCollapsedToolbarComposition() {
  return React.createElement(toolbarEntry.RDGToolbarProvider, {
    children: [
      React.createElement(toolbarEntry.RDGToolbar, {
        key: "toolbar",
        toolbarCollapsedColumnToggles: true,
      }),
      React.createElement(toolbarEntry.RDGToolbarTarget, {
        key: "target",
        children: createGrid({ enableFiltering: false }),
      }),
    ],
  });
}

function createCombinedComposition() {
  return React.createElement(components.RDGProvider, {
    children: [
      React.createElement(components.RDGSearchBar, { key: "search" }),
      React.createElement(components.RDGToolbar, {
        key: "toolbar",
      }),
      React.createElement(components.RDGTarget, {
        key: "target",
        children: createGrid({ enableFiltering: false }),
      }),
    ],
  });
}

const originalConsoleError = console.error;
const unexpectedServerErrors = [];
console.error = (...args) => {
  const message = String(args[0] ?? "");
  if (message.includes("useLayoutEffect does nothing on the server")) return;
  unexpectedServerErrors.push(args);
  originalConsoleError(...args);
};

let serverMarkup;
try {
  serverMarkup = ReactDOMServer.renderToString(
    React.createElement("div", null, [
      React.cloneElement(createGrid(), { key: "core" }),
      React.createElement(
        "div",
        { key: "combined" },
        createCombinedComposition()
      ),
    ])
  );
} finally {
  console.error = originalConsoleError;
}

assert.deepEqual(
  unexpectedServerErrors,
  [],
  "the packed package must not emit unexpected SSR errors"
);
assert.match(serverMarkup, /InovuaReactDataGrid/);
assert.match(serverMarkup, /data-slot="grid-header-cell"/);
assert.match(serverMarkup, /Name/);

const unexpectedClientErrors = [];
console.error = (...args) => {
  unexpectedClientErrors.push(args.map((value) => String(value)).join(" "));
  originalConsoleError(...args);
};

const reactMajor = Number.parseInt(React.version.split(".", 1)[0], 10);

async function settle() {
  for (let index = 0; index < 4; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function mount(element) {
  const container = document.createElement("div");
  document.body.append(container);

  if (reactMajor >= 18) {
    const { createRoot } = require("react-dom/client");
    const root = createRoot(container);
    if (typeof ReactDOM.flushSync === "function") {
      ReactDOM.flushSync(() => root.render(element));
    } else {
      root.render(element);
    }
    await settle();
    return {
      container,
      async unmount() {
        if (typeof ReactDOM.flushSync === "function") {
          ReactDOM.flushSync(() => root.unmount());
        } else {
          root.unmount();
        }
        container.remove();
        await settle();
      },
    };
  }

  ReactDOM.render(element, container);
  await settle();
  return {
    container,
    async unmount() {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
      await settle();
    },
  };
}

/*
 * Radix menus open on `pointerdown` and read `pointerType` off the event, and
 * jsdom ships no `PointerEvent` - so the MouseEvent standing in for one has to
 * carry that property itself.
 */
function pressPointer(element) {
  const pointerDown = new window.MouseEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
  });
  Object.defineProperty(pointerDown, "pointerType", { value: "mouse" });
  element.dispatchEvent(pointerDown);
  element.dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, button: 0 })
  );
}

async function assertComposition(name, element, assertions) {
  const mounted = await mount(element);
  try {
    assert.ok(
      mounted.container.querySelector(".tdg-root.InovuaReactDataGrid"),
      `${name} must render its ReactDataGrid target`
    );
    await assertions?.(mounted.container);
  } finally {
    await mounted.unmount();
  }
}

await assertComposition("core", createGrid(), async (container) => {
  assert.match(container.textContent, /Ada Lovelace/);
  const menuTrigger = container.querySelector(
    'button[aria-label="Column menu"]'
  );
  assert.ok(
    menuTrigger,
    "the core grid must render its Radix column-menu trigger"
  );

  pressPointer(menuTrigger);
  await settle();
  assert.ok(
    document.body.querySelector('[role="menu"]'),
    "the Radix column menu must open"
  );
});

await assertComposition("search", createSearchComposition(), (container) => {
  assert.ok(
    container.querySelector('input[aria-label="Search all fields"]'),
    "the search provider/bar/target composition must render"
  );
});

await assertComposition(
  "toolbar",
  createToolbarComposition(),
  async (container) => {
    await settle();
    assert.ok(
      container.querySelector('[data-slot="rdg-toolbar"]'),
      "the toolbar provider/toolbar/target composition must render"
    );
    assert.ok(
      container.querySelector('[data-slot="rdg-column-toggle"]'),
      "the toolbar must receive its target columns"
    );
    assert.ok(
      container.querySelector('[data-slot="rdg-toolbar-export"]'),
      "the built-in export control must render when showExport is set"
    );
    assert.ok(
      container.querySelector('[data-slot="rdg-toolbar-filter-toggle"]'),
      "the built-in filter toggle must render when showFilterToggle is set"
    );

    const nameToggle = container.querySelector(
      '[data-slot="rdg-column-toggle"][data-column-id="name"]'
    );
    assert.ok(nameToggle, "the Name column must expose a visibility toggle");
    assert.equal(nameToggle.getAttribute("aria-pressed"), "true");
    nameToggle.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 })
    );
    await settle();
    assert.equal(nameToggle.getAttribute("aria-pressed"), "false");
    assert.equal(
      container.querySelector(
        '[data-slot="grid-header-cell"][data-column-id="name"]'
      ),
      null,
      "the provider/toolbar/target composition must hide the real grid column"
    );
  }
);

/*
 * The dropdown the toolbar shows at narrow widths is the grid's own menu,
 * reached through a runtime symbol rather than a second bundled copy of it.
 * Only the packed package proves that hand-off works - and this is the one
 * suite that exercises it on the oldest React the package supports.
 */
await assertComposition(
  "toolbar-collapsed",
  createCollapsedToolbarComposition(),
  async (container) => {
    await settle();
    assert.equal(
      container.querySelector('[data-slot="rdg-column-toggle-list"]'),
      null,
      "the collapsed toolbar must not render inline column buttons"
    );

    const trigger = container.querySelector(
      '[data-slot="rdg-toolbar-column-toggle-trigger"]'
    );
    assert.ok(
      trigger,
      "the collapsed toolbar must render its dropdown trigger"
    );

    pressPointer(trigger);
    await settle();

    const menu = container.querySelector(
      '[data-slot="rdg-toolbar-column-toggle-menu"]'
    );
    assert.ok(menu, "the column menu must open inside the toolbar root");

    const nameOption = menu.querySelector(
      '[role="menuitemcheckbox"][data-column-id="name"]'
    );
    assert.ok(nameOption, "the Name column must expose a menu row");
    assert.equal(nameOption.getAttribute("aria-checked"), "true");

    nameOption.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 })
    );
    await settle();
    assert.equal(
      container.querySelector(
        '[data-slot="grid-header-cell"][data-column-id="name"]'
      ),
      null,
      "a menu row must hide the real grid column"
    );
  }
);

await assertComposition(
  "combined",
  createCombinedComposition(),
  (container) => {
    assert.ok(container.querySelector('[data-slot="rdg-toolbar"]'));
    assert.ok(container.querySelector('input[aria-label="Search all fields"]'));
  }
);

await assertComposition(
  "mobile",
  createGrid({ allowMobileTransform: true, editable: false }),
  async (container) => {
    await settle();
    assert.ok(
      container.querySelector('[data-slot="mobile-grid-list"]'),
      "the React-compatible mobile implementation must render"
    );
  }
);

console.error = originalConsoleError;
assert.deepEqual(
  unexpectedClientErrors,
  [],
  "the compatibility mounts must not emit React development warnings"
);
assert.deepEqual(windowErrors, [], "the compatibility mounts must not throw");
dom.window.close();

console.log(
  `React ${React.version}: declarations and runtime compositions passed.`
);

// React 16's scheduler can retain a MessageChannel handle after every root is
// unmounted. All assertions and cleanup have completed at this point, so exit
// explicitly instead of letting that implementation detail hang the matrix.
process.exit(0);
