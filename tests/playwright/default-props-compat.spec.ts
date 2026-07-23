import { expect, test } from "@playwright/test";

test("defaultProps static is available from the ReactDataGrid default export", async ({
  page,
}) => {
  await page.goto("/compat/default-props");

  await expect(
    page.getByRole("heading", { name: "defaultProps compatibility check" })
  ).toBeVisible();

  await expect(page.getByTestId("default-props-available")).toContainText(
    "true"
  );
  await expect(page.getByTestId("default-props-keys")).toContainText(
    "filterTypes"
  );
  await expect(page.getByTestId("default-props-keys")).toContainText("theme");
  await expect(page.getByTestId("default-props-keys")).toContainText(
    "emptyText"
  );
  await expect(page.getByTestId("default-props-keys")).toContainText(
    "virtualizeColumnsThreshold"
  );
  await expect(page.getByTestId("default-props-keys")).toContainText(
    "liveColumnResize"
  );
  await expect(
    page.getByTestId("default-props-string-operators")
  ).toContainText("contains");
  await expect(page.getByTestId("default-props-values")).toHaveText(
    "theme=default-light,virtualized=true,virtualizeColumnsThreshold=15,allowMobileTransform=false,liveColumnResize=false,rowHeight=40,emptyText=noRecords"
  );
  await expect(page.getByTestId("default-props-filtered-count")).toContainText(
    "3"
  );
  await expect(page.getByRole("cell", { name: "Ada Lovelace" })).toBeVisible();
});
