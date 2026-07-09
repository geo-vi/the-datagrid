import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import App, { useExamplesUi } from "./App";
import ActionsGridExample from "./ActionsGridExample";
import BasicGridExample from "./BasicGridExample";
import ComputedPropsCompatPage from "./ComputedPropsCompatPage";
import DefaultPropsCompatPage from "./DefaultPropsCompatPage";
import ExampleDetailPage from "./ExampleDetailPage";
import ExamplesOverviewPage from "./ExamplesOverviewPage";
import Issue16CssScopeExample from "./Issue16CssScopeExample";
import Issue17FixedContractExample from "./Issue17FixedContractExample";
import Issue20HeightExample from "./Issue20HeightExample";
import Issue21MissingImportsExample from "./Issue21MissingImportsExample";
import MobileTransformExample from "./MobileTransformExample";
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

function Issue16CssScopeExamplePage() {
  const example = getExampleMeta("issue-16-css-scope");

  if (!example) {
    throw new Error("Missing example metadata for issue-16-css-scope");
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
      <Issue16CssScopeExample />
    </ExampleDetailPage>
  );
}

function Issue17FixedContractExamplePage() {
  const example = getExampleMeta("issue-17");

  if (!example) {
    throw new Error("Missing example metadata for issue-17");
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
      <Issue17FixedContractExample />
    </ExampleDetailPage>
  );
}

function Issue20HeightExamplePage() {
  const example = getExampleMeta("issue-20-height");

  if (!example) {
    throw new Error("Missing example metadata for issue-20-height");
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
      <Issue20HeightExample />
    </ExampleDetailPage>
  );
}

function Issue21MissingImportsExamplePage() {
  const example = getExampleMeta("issue-21-missing-imports");

  if (!example) {
    throw new Error("Missing example metadata for issue-21-missing-imports");
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
      <Issue21MissingImportsExample />
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

function MobileTransformExamplePage() {
  const example = getExampleMeta("mobile-transform");
  if (!example) throw new Error("Missing mobile transform metadata");
  return (
    <ExampleDetailPage {...example}>
      <MobileTransformExample />
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

const exampleIssue16CssScopeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/issue-16-css-scope",
  component: Issue16CssScopeExamplePage,
});

const exampleIssue17FixedContractRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/issue-17",
  component: Issue17FixedContractExamplePage,
});

const exampleIssue20HeightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/issue-20-height",
  component: Issue20HeightExamplePage,
});

const exampleIssue21MissingImportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/issue-21-missing-imports",
  component: Issue21MissingImportsExamplePage,
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

const exampleMobileTransformRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/mobile-transform",
  component: MobileTransformExamplePage,
});

const legacyBasicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "basic",
  component: BasicExamplePage,
});

const legacyIssue16CssScopeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "issue-16-css-scope",
  component: Issue16CssScopeExamplePage,
});

const legacyIssue17FixedContractRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "issue-17",
  component: Issue17FixedContractExamplePage,
});

const legacyIssue20HeightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "issue-20-height",
  component: Issue20HeightExamplePage,
});

const legacyIssue21MissingImportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "issue-21-missing-imports",
  component: Issue21MissingImportsExamplePage,
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

const compatComputedPropsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/computed-props",
  component: ComputedPropsCompatPage,
});

const compatDefaultPropsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/default-props",
  component: DefaultPropsCompatPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  docsRoute.addChildren([docsIndexRoute, docsPageRoute]),
  compatComputedPropsRoute,
  compatDefaultPropsRoute,
  examplesOverviewRoute,
  exampleActionsRoute,
  exampleBasicRoute,
  exampleIssue16CssScopeRoute,
  exampleIssue17FixedContractRoute,
  exampleIssue20HeightRoute,
  exampleIssue21MissingImportsRoute,
  exampleSelectionRoute,
  exampleUsersRoute,
  exampleMobileTransformRoute,
  legacyActionsRoute,
  legacyBasicRoute,
  legacyIssue16CssScopeRoute,
  legacyIssue17FixedContractRoute,
  legacyIssue20HeightRoute,
  legacyIssue21MissingImportsRoute,
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
