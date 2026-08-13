import { expect, test } from "@playwright/test";

test("documents provider requirements and conditional grid targets", async ({
  page,
}) => {
  await page.goto("/docs/reference/providers-and-targets");

  await expect(
    page.getByRole("heading", { level: 1, name: "Providers and targets" })
  ).toBeVisible();

  const sidebarLink = page
    .getByTestId("docs-sidebar")
    .getByRole("link", { name: "Providers & targets", exact: true });
  await expect(sidebarLink).toHaveAttribute("aria-current", "page");

  for (const heading of [
    "The provider contract",
    "Direct grid children connect automatically",
    "When a target is required",
    "Required target: nested mixed-controls layout",
    "Combined provider with existing control imports",
    "Why targets exist",
    "Scope providers deliberately",
    "Troubleshooting provider connections",
    "Combined and stable feature-specific APIs",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading })
    ).toBeVisible();
  }

  await expect(
    page.getByRole("cell", {
      name: "Grid is an immediate provider child",
      exact: true,
    })
  ).toBeAttached();
  const nestedLayoutRow = page.getByRole("row").filter({
    has: page.getByRole("cell", {
      name: "Grid is inside a div, section, card, or panel",
      exact: true,
    }),
  });
  await expect(nestedLayoutRow).toHaveCount(1);
  await expect(
    nestedLayoutRow.getByRole("cell", { name: "Required", exact: true })
  ).toBeVisible();

  const stableApiSection = page.locator("#stable-provider-apis");
  for (const publicApi of [
    "RDGProvider",
    "RDGTarget",
    "RDGSearchProvider",
    "RDGSearchTarget",
    "RDGToolbarProvider",
    "RDGToolbarTarget",
  ]) {
    await expect(
      stableApiSection.getByRole("cell", { name: publicApi, exact: true })
    ).toBeVisible();
  }

  const pageContent = page.locator("main");
  await expect(pageContent).toContainText("@geovi/the-datagrid/components");
  await expect(pageContent).toContainText("@geovi/the-datagrid/search");
  await expect(pageContent).toContainText("@geovi/the-datagrid/toolbar");
  await expect(pageContent).toContainText(
    "The four feature-specific APIs above remain available"
  );
  await expect(pageContent).toContainText("defaultSearchValue");

  await expect(
    page.getByRole("link", { name: "table search guide", exact: true })
  ).toHaveAttribute("href", "/docs/guides/table-search");
  await expect(
    page.getByRole("link", {
      name: "toolbar reference",
      exact: true,
    })
  ).toHaveAttribute("href", "/docs/reference/toolbar");
});

test("documents toolbar initialization, remount, and semantics", async ({
  page,
}) => {
  await page.goto("/docs/reference/toolbar");

  await expect(
    page.getByRole("heading", { level: 1, name: "Grid toolbar" })
  ).toBeVisible();

  const content = page.locator("main");
  await expect(content).toContainText("visible: false");
  await expect(content).toContainText("defaultHidden");
  await expect(content).toContainText("real grid remount");
  await expect(content).toContainText("level-two heading");
  await expect(content).toContainText("aria-describedby");
  await expect(content).toContainText("@geovi/the-datagrid/components");
});
