import { notFound, useRouterState } from "@tanstack/react-router";

import { DocsPageArticle, getDocsPage } from "./docsContent";

export default function DocsPageScreen() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/);

  if (!match) {
    throw notFound();
  }

  const [, group, slug] = match;
  const page = getDocsPage(group, slug);

  if (!page) {
    throw notFound();
  }

  return <DocsPageArticle page={page} />;
}
