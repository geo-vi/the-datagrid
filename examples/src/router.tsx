import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import App, { useExamplesUi } from "./App";
import ActionsGridExample from "./ActionsGridExample";
import BasicGridExample from "./BasicGridExample";
import ExampleDetailPage from "./ExampleDetailPage";
import ExamplesOverviewPage from "./ExamplesOverviewPage";
import SelectionGridExample from "./SelectionGridExample";
import UsersGridExample from "./UsersGridExample";
import DocsHomePage from "./docs/DocsHomePage";
import DocsIndexPage from "./docs/DocsIndexPage";
import DocsLayout from "./docs/DocsLayout";
import DocsPageScreen from "./docs/DocsPageScreen";
import { getExampleMeta } from "./exampleMeta";

function BasicExamplePage() {
  const example = getExampleMeta("basic");

  if (!example) {
    throw new Error("Missing example metadata for basic");
  }

  return (
    <ExampleDetailPage
      title={example.title}
      summary={example.summary}
      details={example.details}
      sourcePath={example.sourcePath}
      sourceCode={example.sourceCode}
      tags={example.tags}
    >
      <BasicGridExample />
    </ExampleDetailPage>
  );
}

function ActionsExamplePage() {
  const example = getExampleMeta("actions");

  if (!example) {
    throw new Error("Missing example metadata for actions");
  }

  return (
    <ExampleDetailPage
      title={example.title}
      summary={example.summary}
      details={example.details}
      sourcePath={example.sourcePath}
      sourceCode={example.sourceCode}
      tags={example.tags}
    >
      <ActionsGridExample />
    </ExampleDetailPage>
  );
}

function SelectionExamplePage() {
  const example = getExampleMeta("selection");

  if (!example) {
    throw new Error("Missing example metadata for selection");
  }

  return (
    <ExampleDetailPage
      title={example.title}
      summary={example.summary}
      details={example.details}
      sourcePath={example.sourcePath}
      sourceCode={example.sourceCode}
      tags={example.tags}
    >
      <SelectionGridExample />
    </ExampleDetailPage>
  );
}

function UsersExamplePage() {
  const { gridTheme, i18n, resizable } = useExamplesUi();
  const example = getExampleMeta("users");

  if (!example) {
    throw new Error("Missing example metadata for users");
  }

  return (
    <ExampleDetailPage
      title={example.title}
      summary={example.summary}
      details={example.details}
      sourcePath={example.sourcePath}
      sourceCode={example.sourceCode}
      tags={example.tags}
    >
      <UsersGridExample theme={gridTheme} i18n={i18n} resizable={resizable} />
    </ExampleDetailPage>
  );
}

const rootRoute = createRootRoute({
  component: App,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DocsHomePage,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "docs",
  component: DocsLayout,
});

const docsIndexRoute = createRoute({
  getParentRoute: () => docsRoute,
  path: "/",
  component: DocsIndexPage,
});

const docsPageRoute = createRoute({
  getParentRoute: () => docsRoute,
  path: "$group/$slug",
  component: DocsPageScreen,
});

const examplesOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples",
  component: ExamplesOverviewPage,
});

const exampleBasicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/basic",
  component: BasicExamplePage,
});

const exampleActionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/actions",
  component: ActionsExamplePage,
});

const exampleSelectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/selection",
  component: SelectionExamplePage,
});

const exampleUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/users",
  component: UsersExamplePage,
});

const legacyBasicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "basic",
  component: BasicExamplePage,
});

const legacyActionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "actions",
  component: ActionsExamplePage,
});

const legacySelectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "selection",
  component: SelectionExamplePage,
});

const legacyUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "users",
  component: UsersExamplePage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  docsRoute.addChildren([docsIndexRoute, docsPageRoute]),
  examplesOverviewRoute,
  exampleActionsRoute,
  exampleBasicRoute,
  exampleSelectionRoute,
  exampleUsersRoute,
  legacyActionsRoute,
  legacyBasicRoute,
  legacySelectionRoute,
  legacyUsersRoute,
]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
