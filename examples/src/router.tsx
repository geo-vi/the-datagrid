import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import App from "./App";
import BasicGridExample from "./BasicGridExample";
import ExampleDetailPage from "./ExampleDetailPage";
import ExamplesOverviewPage from "./ExamplesOverviewPage";
import UsersGridExample from "./UsersGridExample";
import { useExamplesUi } from "./App";
import { getExampleMeta } from "./exampleMeta";

function BasicExamplePage() {
  const example = getExampleMeta("/basic");

  if (!example) {
    throw new Error("Missing example metadata for /basic");
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

function UsersExamplePage() {
  const { gridTheme, i18n, resizable } = useExamplesUi();
  const example = getExampleMeta("/users");

  if (!example) {
    throw new Error("Missing example metadata for /users");
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

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ExamplesOverviewPage,
});

const basicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "basic",
  component: BasicExamplePage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "users",
  component: UsersExamplePage,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  basicRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
