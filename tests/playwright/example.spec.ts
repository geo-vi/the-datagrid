import { expect, test } from "@playwright/test";

test("loads the example app and switches the grid theme", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "the-datagrid demo" })).toBeVisible();

  const grid = page.locator(".tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "default");

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-dark");

  const hoverVars = await grid.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      odd: style.getPropertyValue("--tdg-row-odd-hover-bg").trim(),
      even: style.getPropertyValue("--tdg-row-even-hover-bg").trim(),
    };
  });

  expect(hoverVars).toEqual({
    odd: "rgb(33.6, 33.6, 33.6)",
    even: "rgb(33.6, 33.6, 33.6)",
  });

  await page.getByRole("button", { name: "Filter" }).first().click();

  const menu = page.getByRole("menu").last();
  await expect(menu.getByText("Filter", { exact: true })).toBeVisible();
  await expect(menu.getByText("Operator", { exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Clear" })).toBeVisible();
  await expect(menu.getByRole("menuitemradio", { name: /^Contains$/ })).toHaveAttribute("aria-checked", "true");

  const menuStyles = await menu.evaluate((el) => {
    const cs = getComputedStyle(el);
    const root = el.closest(".tdg-root");

    return {
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderColor,
      theme: root?.getAttribute("data-theme") ?? null,
      insideGrid: Boolean(root),
    };
  });

  expect(menuStyles).toEqual({
    backgroundColor: "rgb(49, 57, 67)",
    color: "rgb(155, 167, 180)",
    borderColor: "rgb(56, 56, 56)",
    theme: "ikarus-dark",
    insideGrid: true,
  });
});
