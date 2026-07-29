import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import App, { useExamplesUi } from "./App";
import ActionsGridExample from "./ActionsGridExample";
import BasicGridExample from "./BasicGridExample";
import ColumnsGridExample from "./ColumnsGridExample";
import ColumnVisibilityCompatPage from "./ColumnVisibilityCompatPage";
import ComputedPropsCompatPage from "./ComputedPropsCompatPage";
import DefaultPropsCompatPage from "./DefaultPropsCompatPage";
import DisabledRowsCompatPage from "./DisabledRowsCompatPage";
import ExampleDetailPage from "./ExampleDetailPage";
import ExamplesOverviewPage from "./ExamplesOverviewPage";
import FilteredRowsCountCompatPage from "./FilteredRowsCountCompatPage";
import GitHubIssues31And32CompatPage from "./GitHubIssues31And32CompatPage";
import GitHubIssues33To48CompatPage from "./GitHubIssues33To48CompatPage";
import InovuaParityCompatPage from "./InovuaParityCompatPage";
import InovuaParityExamplePage from "./InovuaParityExamplePage";
import InovuaPendingParityCompatPage from "./InovuaPendingParityCompatPage";
import Issue48CompatPage from "./Issue48CompatPage";
import Issue58RowStyleColorCompatPage from "./Issue58RowStyleColorCompatPage";
import Issue32DataSourceCompatPage from "./Issue32DataSourceCompatPage";
import Issue33SortingCompatPage from "./Issue33SortingCompatPage";
import Issue34FilteringCompatPage from "./Issue34FilteringCompatPage";
import Issue35ColumnStateCompatPage from "./Issue35ColumnStateCompatPage";
import MemorySafetyCompatPage from "./MemorySafetyCompatPage";
import MobileTransformExample from "./MobileTransformExample";
import SearchDataSourceCompatPage from "./SearchDataSourceCompatPage";
import SelectionGridExample from "./SelectionGridExample";
import UsersGridExample from "./UsersGridExample";
import DocsHomePage from "./docs/DocsHomePage";
import DocsIndexPage from "./docs/DocsIndexPage";
import DocsLayout from "./docs/DocsLayout";
import DocsPageScreen from "./docs/DocsPageScreen";
import { getExampleMeta } from "./exampleMeta";

function InovuaParityFixturePage() {
  return <InovuaParityCompatPage compactFixture />;
}

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

function ColumnsExamplePage() {
  const example = getExampleMeta("columns");

  if (!example) {
    throw new Error("Missing example metadata for columns");
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
      <ColumnsGridExample />
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
  const { gridTheme, i18n, resizable, showCellBorders } = useExamplesUi();
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
      <UsersGridExample
        theme={gridTheme}
        i18n={i18n}
        resizable={resizable}
        showCellBorders={showCellBorders}
      />
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

const exampleColumnsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/columns",
  component: ColumnsExamplePage,
});

const exampleActionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/actions",
  component: ActionsExamplePage,
});

const exampleInovuaParityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "examples/inovua-parity",
  component: InovuaParityExamplePage,
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

const legacyColumnsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "columns",
  component: ColumnsExamplePage,
});

const legacyActionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "actions",
  component: ActionsExamplePage,
});

const legacyInovuaParityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "inovua-parity",
  component: InovuaParityExamplePage,
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

const removedIssueExamplePaths = [
  "examples/issue-16-css-scope",
  "examples/issue-17",
  "examples/issue-20-height",
  "examples/issue-21-missing-imports",
  "issue-16-css-scope",
  "issue-17",
  "issue-20-height",
  "issue-21-missing-imports",
] as const;

const removedIssueExampleRedirectRoutes = removedIssueExamplePaths.map((path) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    beforeLoad: () => {
      throw redirect({ to: "/examples/columns", replace: true });
    },
  })
);

const compatComputedPropsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/computed-props",
  component: ComputedPropsCompatPage,
});

const compatColumnVisibilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/column-visibility",
  component: ColumnVisibilityCompatPage,
});

const compatDefaultPropsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/default-props",
  component: DefaultPropsCompatPage,
});

const compatDisabledRowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/disabled-rows",
  component: DisabledRowsCompatPage,
});

const compatFilteredRowsCountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/filtered-rows-count",
  component: FilteredRowsCountCompatPage,
});

const compatGitHubIssues31And32Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/github-issues-31-32",
  component: GitHubIssues31And32CompatPage,
});

const compatIssue32DataSourceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-32-data-source",
  component: Issue32DataSourceCompatPage,
});

const compatIssue33SortingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-33-sorting",
  component: Issue33SortingCompatPage,
});

const compatIssue34FilteringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-34-filtering",
  component: Issue34FilteringCompatPage,
});

const compatIssue35ColumnStateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-35-column-state",
  component: Issue35ColumnStateCompatPage,
});

const compatGitHubIssues33To48Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/github-issues-33-48",
  component: GitHubIssues33To48CompatPage,
});

const compatMemorySafetyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/memory-safety",
  component: MemorySafetyCompatPage,
});

const compatInovuaParityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/inovua-parity",
  component: InovuaParityFixturePage,
});

const compatInovuaPendingParityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/inovua-pending-parity",
  component: InovuaPendingParityCompatPage,
});

const compatIssue48Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-48",
  component: Issue48CompatPage,
});

const compatIssue58RowStyleColorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/issue-58-row-style-color",
  component: Issue58RowStyleColorCompatPage,
});

const compatSearchDataSourceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "compat/search-data-source",
  component: SearchDataSourceCompatPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  docsRoute.addChildren([docsIndexRoute, docsPageRoute]),
  compatColumnVisibilityRoute,
  compatComputedPropsRoute,
  compatDefaultPropsRoute,
  compatDisabledRowsRoute,
  compatFilteredRowsCountRoute,
  compatGitHubIssues31And32Route,
  compatIssue32DataSourceRoute,
  compatIssue33SortingRoute,
  compatIssue34FilteringRoute,
  compatIssue35ColumnStateRoute,
  compatGitHubIssues33To48Route,
  compatInovuaParityRoute,
  compatInovuaPendingParityRoute,
  compatIssue48Route,
  compatIssue58RowStyleColorRoute,
  compatMemorySafetyRoute,
  compatSearchDataSourceRoute,
  examplesOverviewRoute,
  exampleActionsRoute,
  exampleBasicRoute,
  exampleColumnsRoute,
  exampleInovuaParityRoute,
  exampleSelectionRoute,
  exampleUsersRoute,
  exampleMobileTransformRoute,
  legacyActionsRoute,
  legacyBasicRoute,
  legacyColumnsRoute,
  legacyInovuaParityRoute,
  legacySelectionRoute,
  legacyUsersRoute,
  ...removedIssueExampleRedirectRoutes,
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
