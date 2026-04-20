import { expect, test } from "@playwright/test";

test("computed props expose the broader Inovua-compatible runtime surface", async ({
  page,
}) => {
  await page.goto("/compat/computed-props");

  await expect(
    page.getByRole("heading", { name: "TypeComputedProps compatibility check" })
  ).toBeVisible();

  await expect(page.getByTestId("compat-apiReady")).toContainText("true");

  await page.getByTestId("compat-run").click();

  await expect(page.getByTestId("compat-hasPublicApi")).toContainText("true");
  await expect(page.getByTestId("compat-columnsMap")).toContainText(
    "id,name,city"
  );
  await expect(page.getByTestId("compat-columnByName")).toContainText("name");
  await expect(page.getByTestId("compat-cityVisible")).toContainText("false");
  await expect(page.getByTestId("compat-visibleColumns")).toContainText(
    "name,id"
  );
  await expect(page.getByTestId("compat-sortInfo")).toContainText("name:1");
  await expect(page.getByTestId("compat-filterValue")).toContainText("a");
  await expect(page.getByTestId("compat-headerOrder")).toContainText("name,id");
  await expect(page.getByTestId("compat-domNode")).toContainText("grid-row");
  await expect(page.getByTestId("compat-renderRange")).not.toContainText(
    "missing"
  );
  await expect(page.getByTestId("compat-size")).not.toContainText("0x0");
  await expect(page.getByTestId("compat-scrollWorked")).toContainText("true");

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(
    grid.locator('[data-slot="grid-header-cell"][data-column-id="city"]')
  ).toHaveCount(0);
});
