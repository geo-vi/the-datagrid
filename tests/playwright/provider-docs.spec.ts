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
    "Required target: nested search layout",
    "Required target: custom visibility layout",
    "Scope providers deliberately",
    "Troubleshooting provider connections",
    "Stable feature-specific APIs",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading })
    ).toBeAttached();
  }

  await expect(
    page.getByRole("cell", {
      name: "Grid is an immediate provider child",
      exact: true,
    })
  ).toBeAttached();
  await expect(
    page.getByRole("cell", {
      name: "Grid is inside a div, section, card, or panel",
      exact: true,
    })
  ).toBeAttached();
  await expect(
    page.getByRole("cell", { name: "Required", exact: true }).first()
  ).toBeAttached();

  for (const publicApi of [
    "RDGSearchProvider",
    "RDGSearchTarget",
    "RDGColumnVisibilityProvider",
    "RDGColumnVisibilityTarget",
  ]) {
    await expect(
      page.getByRole("cell", { name: publicApi, exact: true })
    ).toBeAttached();
  }

  await expect(
    page.getByRole("link", { name: "table search guide", exact: true })
  ).toHaveAttribute("href", "/docs/guides/table-search");
  await expect(
    page.getByRole("link", {
      name: "column visibility toolbar reference",
      exact: true,
    })
  ).toHaveAttribute("href", "/docs/reference/column-visibility-toolbar");
});
