// Browser acceptance and review screenshots: owned by the hierarchy demo/test task.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const treeGrid = (page: Page) => page.getByTestId("hierarchy-tree-grid");
const detailGrid = (page: Page) => page.getByTestId("hierarchy-detail-grid");
const row = (grid: Locator, id: string) =>
  grid.locator(`[data-slot="grid-row"][data-row-id="${id}"]`);
const treeRows = (page: Page) =>
  treeGrid(page).locator('[data-slot="grid-row"]');
const search = (page: Page) =>
  page.getByRole("searchbox", { name: "Find a team or project" });

async function openShowcase(page: Page, virtualized = true) {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/examples/hierarchy");
  await expect(
    page.getByRole("heading", { name: "Tree rows. Rich details." })
  ).toBeVisible();
  if (!virtualized)
    await page.getByLabel("Virtualized rows", { exact: true }).uncheck();
  await expect(treeRows(page)).toHaveCount(3);
}

async function toggleDetail(page: Page, id: string, expand = true) {
  await row(detailGrid(page), id)
    .getByRole("button", {
      name: expand ? "Expand row details" : "Collapse row details",
      exact: true,
    })
    .click();
}

async function expectDetailLayout(page: Page, id: string, nextId: string) {
  const master = row(detailGrid(page), id);
  const details = detailGrid(page).locator(
    `[data-slot="row-details"][data-row-id="${id}"]`
  );
  const next = row(detailGrid(page), nextId);
  await expect(details).toBeVisible();
  await expect(next).toBeVisible();
  const [masterBox, detailBox, nextBox] = await Promise.all([
    master.boundingBox(),
    details.boundingBox(),
    next.boundingBox(),
  ]);
  expect(masterBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(detailBox!.y).toBeGreaterThanOrEqual(
    masterBox!.y + masterBox!.height - 1
  );
  expect(nextBox!.y).toBeGreaterThanOrEqual(
    detailBox!.y + detailBox!.height - 1
  );
  expect(nextBox!.y - masterBox!.y).toBeCloseTo(260, 0);
}

for (const virtualized of [true, false]) {
  test.describe(
    virtualized ? "virtual hierarchy" : "nonvirtual hierarchy",
    () => {
      test("starts collapsed and preserves three levels and counts through toggles", async ({
        page,
      }) => {
        await openShowcase(page, virtualized);
        await expect(page.getByTestId("tree-filtered-count")).toHaveText(
          "13 nodes"
        );
        await expect(
          treeGrid(page).getByText("API Gateway", { exact: true })
        ).toHaveCount(0);

        const engineering = treeGrid(page).getByRole("button", {
          name: "Expand node engineering",
          exact: true,
        });
        await engineering.focus();
        await engineering.press("Enter");
        await expect(treeRows(page)).toHaveCount(5);
        await expect(
          treeGrid(page).getByRole("button", {
            name: "Collapse node engineering",
            exact: true,
          })
        ).toHaveAttribute("aria-expanded", "true");
        await treeGrid(page)
          .getByRole("button", {
            name: "Expand node engineering/platform",
            exact: true,
          })
          .click();
        await expect(treeRows(page)).toHaveCount(7);
        await expect(
          row(treeGrid(page), "engineering/platform/api")
        ).toContainText("API Gateway");
        await expect(
          row(treeGrid(page), "engineering/platform/api").getByRole("button", {
            name: /node/,
          })
        ).toHaveCount(0);
        await expect(page.getByTestId("tree-filtered-count")).toHaveText(
          "13 nodes"
        );
        await treeGrid(page)
          .getByRole("button", {
            name: "Collapse node engineering",
            exact: true,
          })
          .click();
        await expect(treeRows(page)).toHaveCount(3);
        await expect(page.getByTestId("tree-filtered-count")).toHaveText(
          "13 nodes"
        );
      });

      test("reveals a matching descendant and restores the previous expansion after clearing", async ({
        page,
      }) => {
        await openShowcase(page, virtualized);
        await search(page).fill("API Gateway");
        await expect(treeRows(page)).toHaveCount(3);
        await expect(row(treeGrid(page), "engineering")).toBeVisible();
        await expect(row(treeGrid(page), "engineering/platform")).toBeVisible();
        await expect(
          row(treeGrid(page), "engineering/platform/api")
        ).toBeVisible();
        await expect(page.getByTestId("tree-filtered-count")).toHaveText(
          "3 nodes"
        );
        await expect(row(treeGrid(page), "operations")).toHaveCount(0);

        await page
          .getByRole("button", { name: "Clear search", exact: true })
          .click();
        await expect(treeRows(page)).toHaveCount(3);
        await expect(row(treeGrid(page), "operations")).toBeVisible();
        await expect(row(treeGrid(page), "engineering/platform")).toHaveCount(
          0
        );
        await treeGrid(page)
          .getByRole("button", { name: "Expand node engineering", exact: true })
          .click();
        await search(page).fill("API Gateway");
        await expect(
          row(treeGrid(page), "engineering/platform/api")
        ).toBeVisible();
        await search(page).fill("");
        await expect(treeRows(page)).toHaveCount(5);
        await expect(row(treeGrid(page), "engineering/platform")).toBeVisible();
        await expect(
          row(treeGrid(page), "engineering/platform/api")
        ).toHaveCount(0);
      });

      test("sorts siblings without separating descendants from their parents", async ({
        page,
      }) => {
        await openShowcase(page, virtualized);
        await treeGrid(page)
          .getByRole("button", { name: "Expand node engineering", exact: true })
          .click();
        await treeGrid(page)
          .getByRole("button", {
            name: "Expand node engineering/platform",
            exact: true,
          })
          .click();
        await treeGrid(page)
          .locator('.tdg-header-cell[data-column-id="name"]')
          .getByText("Team / project", { exact: true })
          .click();
        await expect
          .poll(() =>
            treeRows(page).evaluateAll((elements) =>
              elements.map((element) => element.getAttribute("data-row-id"))
            )
          )
          .toEqual([
            "engineering",
            "engineering/applications",
            "engineering/platform",
            "engineering/platform/api",
            "engineering/platform/design",
            "operations",
            "research",
          ]);
      });

      test("renders nested grids in detail panels without overlapping the next master row", async ({
        page,
      }) => {
        await openShowcase(page, virtualized);
        await expect(page.getByTestId("project-details-atlas")).toHaveCount(0);
        await toggleDetail(page, "atlas");
        await expect(page.getByTestId("project-details-atlas")).toBeVisible();
        await expect(
          page
            .getByTestId("project-tasks-atlas")
            .getByText("Navigation foundations", { exact: true })
        ).toBeVisible();
        await expectDetailLayout(page, "atlas", "beacon");
        await expect(
          row(detailGrid(page), "archive").getByRole("button", {
            name: "Expand row details",
            exact: true,
          })
        ).toHaveCount(0);

        await toggleDetail(page, "beacon");
        await expect(page.getByTestId("project-details-atlas")).toBeVisible();
        await expect(page.getByTestId("project-details-beacon")).toBeVisible();
        await toggleDetail(page, "atlas", false);
        await expect(page.getByTestId("project-details-atlas")).toHaveCount(0);
        await expect(page.getByTestId("project-details-beacon")).toBeVisible();
        const [atlasBox, beaconBox] = await Promise.all([
          row(detailGrid(page), "atlas").boundingBox(),
          row(detailGrid(page), "beacon").boundingBox(),
        ]);
        expect(beaconBox!.y - atlasBox!.y).toBeCloseTo(52, 0);
      });

      test("single detail mode closes the previous panel", async ({ page }) => {
        await openShowcase(page, virtualized);
        await page
          .getByLabel("Allow multiple details", { exact: true })
          .uncheck();
        await toggleDetail(page, "atlas");
        await expect(page.getByTestId("project-details-atlas")).toBeVisible();
        await toggleDetail(page, "beacon");
        await expect(page.getByTestId("project-details-atlas")).toHaveCount(0);
        await expect(page.getByTestId("project-details-beacon")).toBeVisible();
        await expect(
          row(detailGrid(page), "atlas").getByRole("button", {
            name: "Expand row details",
            exact: true,
          })
        ).toHaveAttribute("aria-expanded", "false");
      });
    }
  );
}

test("controlled maps wait for accepted proposals and automatic reveal leaves them unchanged", async ({
  page,
}) => {
  await openShowcase(page);
  await page.getByLabel("Controlled expansion", { exact: true }).check();
  await page.getByLabel("Accept expansion changes", { exact: true }).uncheck();
  await treeGrid(page)
    .getByRole("button", { name: "Expand node engineering", exact: true })
    .click();
  await expect(treeRows(page)).toHaveCount(3);
  await expect(page.getByTestId("tree-expansion-proposals")).toHaveText(
    "1 node expansion proposals"
  );
  await toggleDetail(page, "atlas");
  await expect(page.getByTestId("project-details-atlas")).toHaveCount(0);
  await expect(page.getByTestId("detail-expansion-proposals")).toHaveText(
    "1 detail expansion proposals"
  );

  await search(page).fill("API Gateway");
  await expect(row(treeGrid(page), "engineering/platform/api")).toBeVisible();
  await expect(page.getByTestId("tree-expansion-proposals")).toHaveText(
    "1 node expansion proposals"
  );
  await search(page).fill("");
  await expect(row(treeGrid(page), "engineering/platform")).toHaveCount(0);
  await page.getByLabel("Accept expansion changes", { exact: true }).check();
  await treeGrid(page)
    .getByRole("button", { name: "Expand node engineering", exact: true })
    .click();
  await expect(treeRows(page)).toHaveCount(5);
  await toggleDetail(page, "atlas");
  await expect(page.getByTestId("project-details-atlas")).toBeVisible();
});

test("mobile hierarchy controls remain usable without document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples/hierarchy");
  await expect(treeGrid(page)).toBeVisible();
  await expect(treeGrid(page).locator(".tdg-root").first()).toHaveAttribute(
    "data-layout",
    "mobile-list"
  );
  await expect(detailGrid(page).locator(".tdg-root").first()).toHaveAttribute(
    "data-layout",
    "mobile-list"
  );
  await treeGrid(page)
    .getByRole("button", { name: "Expand node engineering", exact: true })
    .click();
  await treeGrid(page)
    .getByRole("button", {
      name: "Expand node engineering/platform",
      exact: true,
    })
    .click();
  await expect(row(treeGrid(page), "engineering/platform/api")).toBeVisible();
  await search(page).fill("API Gateway");
  await expect(page.getByTestId("tree-filtered-count")).toHaveText("3 nodes");
  await toggleDetail(page, "atlas");
  await expect(page.getByTestId("project-details-atlas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    )
    .toBeLessThanOrEqual(1);
});

test("captures hierarchy states for the draft PR", async ({ page }) => {
  await openShowcase(page);
  const screenshotDirectory = path.resolve("docs/screenshots");
  await mkdir(screenshotDirectory, { recursive: true });
  const showcase = page.getByTestId("hierarchy-showcase");
  await showcase.screenshot({
    path: path.join(screenshotDirectory, "hierarchy-collapsed.png"),
    animations: "disabled",
  });
  await search(page).fill("API Gateway");
  await expect(row(treeGrid(page), "engineering/platform/api")).toBeVisible();
  await showcase.screenshot({
    path: path.join(screenshotDirectory, "hierarchy-filtered-tree.png"),
    animations: "disabled",
  });
  await search(page).fill("");
  await treeGrid(page)
    .getByRole("button", { name: "Expand node engineering", exact: true })
    .click();
  await treeGrid(page)
    .getByRole("button", {
      name: "Expand node engineering/platform",
      exact: true,
    })
    .click();
  await toggleDetail(page, "atlas");
  await expect(
    page
      .getByTestId("project-tasks-atlas")
      .getByText("Navigation foundations", { exact: true })
  ).toBeVisible();
  await showcase.screenshot({
    path: path.join(screenshotDirectory, "hierarchy-expanded-details.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    )
    .toBeLessThanOrEqual(1);
  await showcase.screenshot({
    path: path.join(screenshotDirectory, "hierarchy-mobile.png"),
    animations: "disabled",
  });
});
