import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator } from "@playwright/test";

const INOVUA_INDEX_CSS = readFileSync(
  resolve(process.cwd(), "node_modules/@inovua/reactdatagrid-community/index.css"),
  "utf8"
);

test("loads the example app and switches the grid theme", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "the-datagrid demo" })).toBeVisible();

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await expect(grid).toHaveAttribute("data-theme", "default");
  await expect(grid).toHaveAttribute("data-theme-base", "default");

  const defaultGridRadius = await grid.evaluate((element) => {
    return getComputedStyle(element).borderRadius;
  });

  expect(defaultGridRadius).not.toBe("0px");

  const getHeaderFilterChrome = async () => {
    return Promise.all([
      grid.locator(".InovuaReactDataGrid__column-header__content").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          fontWeight: style.fontWeight,
          gap: style.gap,
        };
      }),
      grid.locator(".InovuaReactDataGrid__column-header__filter-wrapper").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          color: style.color,
        };
      }),
      page.getByRole("button", { name: "Filter" }).first().evaluate((element) => {
        const style = getComputedStyle(element);
        const icon = element.querySelector(".InovuaReactDataGrid__column-header__filter-settings-icon");
        return {
          backgroundColor: style.backgroundColor,
          borderTopWidth: style.borderTopWidth,
          borderRightWidth: style.borderRightWidth,
          borderBottomWidth: style.borderBottomWidth,
          borderLeftWidth: style.borderLeftWidth,
          borderTopColor: style.borderTopColor,
          color: style.color,
          iconFill: icon ? getComputedStyle(icon).fill : null,
        };
      }),
    ]);
  };

  const [defaultHeaderChrome, defaultFilterChrome, defaultFilterButton] = await getHeaderFilterChrome();
  const defaultFilterBottomBorder = await grid.locator(".tdg-filter-cell").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderBottomWidth: style.borderBottomWidth,
      borderBottomColor: style.borderBottomColor,
    };
  });

  const scrollArea = grid.locator('[data-slot="scroll-area"]').first();
  await expect(scrollArea).toBeVisible();

  const headerViewport = grid.locator('[data-slot="grid-header-viewport"]').first();
  await expect(headerViewport).toBeVisible();

  const headerAndFilterPositioning = await Promise.all([
    grid.locator(".tdg-header-cell").first().evaluate((element) => {
      return getComputedStyle(element).position;
    }),
    grid.locator(".tdg-filter-cell").first().evaluate((element) => {
      return getComputedStyle(element).position;
    }),
  ]);

  expect(headerAndFilterPositioning).toEqual(["static", "static"]);

  const scrollLayout = await grid.evaluate((element) => {
    const scrollRoot = element.querySelector('[data-slot="scroll-area"]');
    const header = element.querySelector(".InovuaReactDataGrid__header");

    return {
      headerInsideScrollArea: Boolean(scrollRoot?.contains(header)),
    };
  });

  expect(scrollLayout.headerInsideScrollArea).toBe(false);

  const scrollAreaStyles = await scrollArea.evaluate((element) => {
    const style = getComputedStyle(element);
    const horizontalScrollbar = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );
    const verticalScrollbar = element.querySelector<HTMLElement>(
      '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
    );

    return {
      borderTopWidth: style.borderTopWidth,
      borderRightWidth: style.borderRightWidth,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
      horizontalScrollbarDisplay: horizontalScrollbar ? getComputedStyle(horizontalScrollbar).display : null,
      verticalScrollbarDisplay: verticalScrollbar ? getComputedStyle(verticalScrollbar).display : null,
    };
  });

  expect(scrollAreaStyles.borderTopWidth).toBe("0px");
  expect(scrollAreaStyles.borderRightWidth).toBe("0px");
  expect(scrollAreaStyles.borderBottomWidth).toBe("0px");
  expect(scrollAreaStyles.borderLeftWidth).toBe("0px");
  expect([null, "none"]).toContain(scrollAreaStyles.horizontalScrollbarDisplay);
  expect([null, "none"]).toContain(scrollAreaStyles.verticalScrollbarDisplay);

  const sortableHeaderCell = grid.locator(".tdg-header-cell").nth(1);
  await expect(sortableHeaderCell.locator(".tdg-button")).toHaveCount(0);
  const initialHeaderWidths = await grid.locator(".tdg-header-cell").evaluateAll((elements) => {
    return elements.map((element) => {
      return Math.round(element.getBoundingClientRect().width * 100) / 100;
    });
  });
  const sortableHeaderBox = await sortableHeaderCell.boundingBox();
  expect(sortableHeaderBox).not.toBeNull();

  await sortableHeaderCell.click({
    position: {
      x: Math.max(12, (sortableHeaderBox?.width ?? 24) - 12),
      y: (sortableHeaderBox?.height ?? 24) / 2,
    },
  });

  await expect(
    sortableHeaderCell.locator(".InovuaReactDataGrid__sort-icon--asc.InovuaReactDataGrid__sort-icon--active"),
  ).toBeVisible();
  await expect.poll(async () => {
    return grid.locator(".tdg-header-cell").evaluateAll((elements) => {
      return elements.map((element) => {
        return Math.round(element.getBoundingClientRect().width * 100) / 100;
      });
    });
  }).toEqual(initialHeaderWidths);

  await page.getByRole("button", { name: "HF Dark" }).click();
  await expect(grid).toHaveAttribute("data-theme", "hf-dark");

  const hfDarkGridRadius = await grid.evaluate((element) => {
    return getComputedStyle(element).borderRadius;
  });

  expect(hfDarkGridRadius).toBe(defaultGridRadius);

  const [hfDarkHeaderChrome, hfDarkFilterChrome, hfDarkFilterButton] = await getHeaderFilterChrome();

  expect(hfDarkHeaderChrome).toEqual(defaultHeaderChrome);
  expect(hfDarkFilterChrome.paddingTop).toBe(defaultFilterChrome.paddingTop);
  expect(hfDarkFilterChrome.paddingRight).toBe(defaultFilterChrome.paddingRight);
  expect(hfDarkFilterChrome.paddingBottom).toBe(defaultFilterChrome.paddingBottom);
  expect(hfDarkFilterChrome.paddingLeft).toBe(defaultFilterChrome.paddingLeft);
  expect(hfDarkFilterButton.backgroundColor).toBe(defaultFilterButton.backgroundColor);
  expect(hfDarkFilterButton.borderTopWidth).toBe(defaultFilterButton.borderTopWidth);
  expect(hfDarkFilterButton.borderRightWidth).toBe(defaultFilterButton.borderRightWidth);
  expect(hfDarkFilterButton.borderBottomWidth).toBe(defaultFilterButton.borderBottomWidth);
  expect(hfDarkFilterButton.borderLeftWidth).toBe(defaultFilterButton.borderLeftWidth);
  expect(hfDarkFilterButton.borderTopColor).toBe(defaultFilterButton.borderTopColor);
  expect(hfDarkFilterButton.iconFill).toBe(hfDarkFilterButton.color);
  expect(hfDarkFilterButton.iconFill).not.toBe("rgb(0, 0, 0)");
  await expect
    .poll(async () => {
      return grid.locator(".tdg-filter-cell").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderBottomWidth: style.borderBottomWidth,
          borderBottomColor: style.borderBottomColor,
        };
      });
    })
    .toEqual({
      borderBottomWidth: defaultFilterBottomBorder.borderBottomWidth,
      borderBottomColor: "rgb(44, 44, 44)",
    });

  const hfDarkSeparatorStyles = await Promise.all([
    grid.locator(".tdg-header-cell").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRightWidth: style.borderRightWidth,
        borderRightColor: style.borderRightColor,
      };
    }),
    grid.locator(".tdg-filter-cell").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRightWidth: style.borderRightWidth,
        borderRightColor: style.borderRightColor,
      };
    }),
    grid.locator(".InovuaReactDataGrid__row .InovuaReactDataGrid__cell").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRightWidth: style.borderRightWidth,
        borderRightColor: style.borderRightColor,
      };
    }),
  ]);

  for (const separatorStyle of hfDarkSeparatorStyles) {
    expect(separatorStyle.borderRightWidth).toBe("1px");
    expect(separatorStyle.borderRightColor).toBe("rgb(44, 44, 44)");
  }

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  await expect(grid).toHaveAttribute("data-theme", "ikarus-dark");
  await expect(grid).toHaveAttribute("data-theme-base", "dark");

  const ikarusDarkGridRadius = await grid.evaluate((element) => {
    return getComputedStyle(element).borderRadius;
  });

  expect(ikarusDarkGridRadius).toBe(defaultGridRadius);

  const [ikarusHeaderChrome, ikarusFilterChrome, ikarusFilterButton] = await getHeaderFilterChrome();

  expect(ikarusHeaderChrome).toEqual(defaultHeaderChrome);
  expect(ikarusFilterChrome.paddingTop).toBe(defaultFilterChrome.paddingTop);
  expect(ikarusFilterChrome.paddingRight).toBe(defaultFilterChrome.paddingRight);
  expect(ikarusFilterChrome.paddingBottom).toBe(defaultFilterChrome.paddingBottom);
  expect(ikarusFilterChrome.paddingLeft).toBe(defaultFilterChrome.paddingLeft);
  expect(ikarusFilterButton.backgroundColor).toBe(defaultFilterButton.backgroundColor);
  expect(ikarusFilterButton.borderTopWidth).toBe(defaultFilterButton.borderTopWidth);
  expect(ikarusFilterButton.borderRightWidth).toBe(defaultFilterButton.borderRightWidth);
  expect(ikarusFilterButton.borderBottomWidth).toBe(defaultFilterButton.borderBottomWidth);
  expect(ikarusFilterButton.borderLeftWidth).toBe(defaultFilterButton.borderLeftWidth);
  expect(ikarusFilterButton.borderTopColor).toBe(defaultFilterButton.borderTopColor);
  expect(ikarusFilterButton.iconFill).toBe(ikarusFilterButton.color);
  expect(ikarusFilterButton.iconFill).not.toBe("rgb(0, 0, 0)");
  await expect
    .poll(async () => {
      return grid.locator(".tdg-filter-cell").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderBottomWidth: style.borderBottomWidth,
          borderBottomColor: style.borderBottomColor,
        };
      });
    })
    .toEqual({
      borderBottomWidth: defaultFilterBottomBorder.borderBottomWidth,
      borderBottomColor: "rgb(56, 56, 56)",
    });

  await expect.poll(async () => {
    return page.locator(".tdg-header-cell").first().evaluate((element) => {
      return getComputedStyle(element).backgroundColor;
    });
  }).toBe("rgb(24, 24, 24)");

  const darkThemeBase = await grid.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      colorScheme: style.colorScheme,
      hasDarkClass: element.classList.contains("dark"),
    };
  });

  expect(darkThemeBase).toEqual({
    colorScheme: "dark",
    hasDarkClass: true,
  });

  const hoverVars = await grid.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      odd: style.getPropertyValue("--tdg-row-odd-hover-bg").trim(),
      even: style.getPropertyValue("--tdg-row-even-hover-bg").trim(),
    };
  });

  expect(hoverVars).toEqual({
    odd: "rgb(34, 34, 34)",
    even: "rgb(34, 34, 34)",
  });

  const firstHeaderCell = page.locator(".tdg-header-cell").first();

  const headerBorderOn = await firstHeaderCell.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      borderRightWidth: style.borderRightWidth,
      borderRightColor: style.borderRightColor,
    };
  });

  expect(headerBorderOn).toEqual({
    borderRightWidth: "1px",
    borderRightColor: "rgb(56, 56, 56)",
  });

  const ikarusBodySeparator = await grid.locator(".InovuaReactDataGrid__row .InovuaReactDataGrid__cell").first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRightWidth: style.borderRightWidth,
      borderRightColor: style.borderRightColor,
    };
  });

  expect(ikarusBodySeparator.borderRightWidth).toBe("1px");
  expect(ikarusBodySeparator.borderRightColor).not.toBe("rgba(0, 0, 0, 0)");

  await page.getByRole("button", { name: "Vertical separators on" }).click();
  await expect(page.getByRole("button", { name: "Vertical separators off" })).toBeVisible();

  const headerBorderOff = await firstHeaderCell.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      borderRightWidth: style.borderRightWidth,
      borderRightColor: style.borderRightColor,
    };
  });

  expect(headerBorderOff.borderRightWidth).toBe("0px");

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

  expect(menuStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(menuStyles.color).not.toBe("rgb(0, 0, 0)");
  expect(menuStyles.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(menuStyles.theme).toBe("ikarus-dark");
  expect(menuStyles.insideGrid).toBe(true);

});

test("keeps custom light themes on the light shadcn base even inside a dark page", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });

  const grid = page.locator(".InovuaReactDataGrid.tdg-root").first();
  await page.getByRole("button", { name: "HF Light" }).click();

  await expect(grid).toHaveAttribute("data-theme", "hf-light");
  await expect(grid).toHaveAttribute("data-theme-base", "light");

  const lightThemeBase = await grid.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      colorScheme: style.colorScheme,
      hasDarkClass: element.classList.contains("dark"),
    };
  });

  expect(lightThemeBase).toEqual({
    colorScheme: "light",
    hasDarkClass: false,
  });

  const hfLightInput = page.locator(".inovua-react-toolkit-text-input.inovua-react-toolkit-text-input--theme-hf-light").first();
  const hfLightSelect = page.locator(".inovua-react-toolkit-combo-box.inovua-react-toolkit-combo-box--theme-hf-light").first();

  const hfLightShell = await Promise.all([
    hfLightInput.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
      };
    }),
    hfLightSelect.evaluate((element) => {
      const style = getComputedStyle(element);
      const value = element.querySelector(".inovua-react-toolkit-combo-box__value");
      const tools = element.querySelector(".inovua-react-toolkit-combo-box__tools");
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        paddingTop: style.paddingTop,
        alignItems: style.alignItems,
        valueAlignItems: value ? getComputedStyle(value).alignItems : null,
        toolsMarginBottom: tools ? getComputedStyle(tools).marginBottom : null,
        toolsAlignItems: tools ? getComputedStyle(tools).alignItems : null,
      };
    }),
  ]);

  expect(hfLightShell[0]).toBeDefined();
  expect(hfLightShell[1]).toBeDefined();

  for (const shell of hfLightShell.slice(0, 2)) {
    expect(shell.borderRadius).not.toBe("0px");
    expect(shell.boxShadow).not.toBe("none");
    expect(shell.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  }

  expect(hfLightShell[1]).toMatchObject({
    paddingTop: "0px",
    alignItems: "center",
    valueAlignItems: "center",
    toolsMarginBottom: "0px",
    toolsAlignItems: "center",
  });
});

test("keeps custom theme combobox structure aligned with the default shell", async ({ page }) => {
  await page.goto("/");

  const getSelectShellChrome = async () => {
    return page.locator(".tdg-select-trigger.inovua-react-toolkit-combo-box").first().evaluate((element) => {
      const style = getComputedStyle(element);
      const value = element.querySelector(".tdg-select-value");
      const displayValue = element.querySelector(".inovua-react-toolkit-combo-box__value__display-value");
      const tools = element.querySelector(".tdg-select-tools");
      const icon = element.querySelector(".tdg-select-toggle-icon");
      const iconBefore = icon ? getComputedStyle(icon, "::before") : null;

      return {
        height: style.height,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        alignItems: style.alignItems,
        valueGap: value ? getComputedStyle(value).gap : null,
        valueMinHeight: value ? getComputedStyle(value).minHeight : null,
        displayPaddingLeft: displayValue ? getComputedStyle(displayValue).paddingLeft : null,
        displayPaddingRight: displayValue ? getComputedStyle(displayValue).paddingRight : null,
        toolsPaddingLeft: tools ? getComputedStyle(tools).paddingLeft : null,
        toolsMinHeight: tools ? getComputedStyle(tools).minHeight : null,
        iconBeforeDisplay: iconBefore ? iconBefore.display : null,
        iconBeforeContent: iconBefore ? iconBefore.content : null,
      };
    });
  };

  const getSelectListChrome = async () => {
    await page.locator(".tdg-select-trigger.inovua-react-toolkit-combo-box").first().click();

    const chrome = await Promise.all([
      page.locator(".tdg-select-content.inovua-react-toolkit-combo-box__list").first().evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          position: style.position,
          width: rect.width,
        };
      }),
      page.locator(".tdg-select-item.inovua-react-toolkit-combo-box__list__item").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
        };
      }),
    ]);

    await page.keyboard.press("Escape");

    return {
      content: chrome[0],
      item: chrome[1],
    };
  };

  const defaultShell = await getSelectShellChrome();
  const defaultList = await getSelectListChrome();

  await page.getByRole("button", { name: "HF Dark" }).click();
  const hfDarkShell = await getSelectShellChrome();
  const hfDarkList = await getSelectListChrome();

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  const ikarusDarkShell = await getSelectShellChrome();
  const ikarusDarkList = await getSelectListChrome();

  for (const shell of [hfDarkShell, ikarusDarkShell]) {
    expect(shell.height).toBe(defaultShell.height);
    expect(shell.paddingTop).toBe(defaultShell.paddingTop);
    expect(shell.paddingRight).toBe(defaultShell.paddingRight);
    expect(shell.paddingBottom).toBe(defaultShell.paddingBottom);
    expect(shell.paddingLeft).toBe(defaultShell.paddingLeft);
    expect(shell.borderRadius).toBe(defaultShell.borderRadius);
    expect(shell.alignItems).toBe(defaultShell.alignItems);
    expect(shell.valueGap).toBe(defaultShell.valueGap);
    expect(shell.valueMinHeight).toBe(defaultShell.valueMinHeight);
    expect(shell.displayPaddingLeft).toBe(defaultShell.displayPaddingLeft);
    expect(shell.displayPaddingRight).toBe(defaultShell.displayPaddingRight);
    expect(shell.toolsPaddingLeft).toBe(defaultShell.toolsPaddingLeft);
    expect(shell.toolsMinHeight).toBe(defaultShell.toolsMinHeight);
    expect(shell.iconBeforeDisplay).toBe(defaultShell.iconBeforeDisplay);
    expect(shell.iconBeforeContent).toBe(defaultShell.iconBeforeContent);
    expect(shell.boxShadow).toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");
  }

  for (const listChrome of [hfDarkList, ikarusDarkList]) {
    expect(listChrome.content.borderRadius).toBe(defaultList.content.borderRadius);
    expect(listChrome.content.borderTopWidth).toBe(defaultList.content.borderTopWidth);
    expect(listChrome.content.boxShadow).toBe(defaultList.content.boxShadow);
    expect(listChrome.content.position).toBe("relative");
    expect(listChrome.content.width).toBeGreaterThan(200);
    expect(listChrome.item).toEqual(defaultList.item);
  }
});

test("keeps custom theme select focus chrome on the grid-owned border", async ({ page }) => {
  await page.goto("/");

  async function getSelectBorderPair(themeButton: string) {
    await page.getByRole("button", { name: themeButton }).click();

    const select = page.locator(".tdg-select-trigger.inovua-react-toolkit-combo-box").first();
    const rootVars = await page.locator(".tdg-root").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.getPropertyValue("--tdg-select-border-color").trim(),
        focusBorder: style.getPropertyValue("--tdg-select-border-color-focus").trim(),
      };
    });

    const idleBorder = await select.evaluate((element) => getComputedStyle(element).borderTopColor);

    await select.click();
    await page.waitForTimeout(100);

    const openBorder = await select.evaluate((element) => getComputedStyle(element).borderTopColor);
    await page.keyboard.press("Escape");

    return { rootVars, idleBorder, openBorder };
  }

  const ikarusLightBorders = await getSelectBorderPair("Ikarus Light");

  expect(ikarusLightBorders.rootVars.focusBorder).toBe(ikarusLightBorders.rootVars.border);
  expect(ikarusLightBorders.openBorder).not.toBe("rgb(202, 174, 83)");
});

test("keeps custom theme dropdown structure aligned with the default shell", async ({ page }) => {
  await page.goto("/");

  const getMenuChrome = async () => {
    await page.getByRole("button", { name: "Filter" }).first().click();

    const menu = page.locator(".tdg-dropdown-content.inovua-react-toolkit-menu").last();
    const clearItem = page.getByRole("menuitem", { name: "Clear" }).last();
    const radioItem = menu.locator('[data-slot="dropdown-menu-radio-item"]').first();
    const clearCell = clearItem.locator(".tdg-dropdown-cell").first();
    const separator = page.locator(".tdg-dropdown-separator").last();

    await expect(menu).toBeVisible();

    const chrome = await Promise.all([
      menu.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          borderTopColor: style.borderTopColor,
          boxShadow: style.boxShadow,
          display: style.display,
        };
      }),
      clearItem.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          minHeight: style.minHeight,
          borderRadius: style.borderRadius,
          top: rect.top,
          left: rect.left,
        };
      }),
      radioItem.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          minHeight: style.minHeight,
          top: rect.top,
          left: rect.left,
        };
      }),
      clearCell.evaluate((element) => {
        const style = getComputedStyle(element);
        const before = getComputedStyle(element, "::before");
        return {
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          height: style.height,
          beforeDisplay: before.display,
          beforeContent: before.content,
        };
      }),
      separator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          height: style.height,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
        };
      }),
    ]);

    await page.keyboard.press("Escape");

    return {
      content: chrome[0],
      item: chrome[1],
      radioItem: chrome[2],
      cell: chrome[3],
      separator: chrome[4],
    };
  };

  const defaultMenu = await getMenuChrome();

  await page.getByRole("button", { name: "HF Dark" }).click();
  const hfDarkMenu = await getMenuChrome();

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  const ikarusDarkMenu = await getMenuChrome();

  for (const menuChrome of [hfDarkMenu, ikarusDarkMenu]) {
    expect(menuChrome.content.display).toBe("block");
    expect(menuChrome.content.paddingTop).toBe(defaultMenu.content.paddingTop);
    expect(menuChrome.content.paddingRight).toBe(defaultMenu.content.paddingRight);
    expect(menuChrome.content.paddingBottom).toBe(defaultMenu.content.paddingBottom);
    expect(menuChrome.content.paddingLeft).toBe(defaultMenu.content.paddingLeft);
    expect(menuChrome.content.borderRadius).toBe(defaultMenu.content.borderRadius);
    expect(menuChrome.content.borderTopWidth).toBe(defaultMenu.content.borderTopWidth);
    expect(menuChrome.content.boxShadow).toContain("rgba(0, 0, 0, 0.1)");
    expect(menuChrome.content.borderTopColor).not.toBe("rgb(255, 255, 255)");

    expect(menuChrome.item.minHeight).toBe(defaultMenu.item.minHeight);
    expect(menuChrome.item.borderRadius).toBe(defaultMenu.item.borderRadius);
    expect(menuChrome.radioItem.minHeight).toBe(defaultMenu.radioItem.minHeight);
    expect(menuChrome.radioItem.top).toBeGreaterThan(menuChrome.item.top);
    expect(Math.abs(menuChrome.radioItem.left - menuChrome.item.left)).toBeLessThanOrEqual(2);
    expect(menuChrome.cell).toEqual(defaultMenu.cell);
    expect(menuChrome.separator).toEqual(defaultMenu.separator);
  }
});

test("keeps the dialog shell visible under global legacy css imports", async ({ page }) => {
  await page.goto("/");

  const openDialog = async () => {
    await page.getByRole("button", { name: "Open Dialog" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  };

  const dialogSnapshot = async () => {
    return page.locator('[data-slot="dialog-content"]').evaluate((element) => {
      const style = getComputedStyle(element);
      const closeButton = element.querySelector('[data-slot="dialog-close"]');
      const rect = element.getBoundingClientRect();

      return {
        display: style.display,
        position: style.position,
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        paddingTop: style.paddingTop,
        maxWidth: style.maxWidth,
        computedLeft: style.left,
        computedTop: style.top,
        computedTransform: style.transform,
        computedTranslate: style.translate,
        closePosition: closeButton ? getComputedStyle(closeButton).position : null,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    });
  };

  const overlaySnapshot = async () => {
    return page.locator('[data-slot="dialog-overlay"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        position: style.position,
        backgroundColor: style.backgroundColor,
      };
    });
  };

  await openDialog();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const lightDialog = await dialogSnapshot();
  const lightOverlay = await overlaySnapshot();

  expect(lightDialog.display).toBe("grid");
  expect(lightDialog.position).toBe("relative");
  expect(lightDialog.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightDialog.borderTopWidth).toBe("1px");
  expect(lightDialog.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightDialog.paddingTop).toBe("24px");
  expect(lightDialog.closePosition).toBe("absolute");
  expect(Math.abs(lightDialog.centerX - (viewport?.width ?? 0) / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(lightDialog.centerY - (viewport?.height ?? 0) / 2)).toBeLessThanOrEqual(2);
  expect(lightOverlay.display).toBe("block");
  expect(lightOverlay.position).toBe("fixed");
  expect(lightOverlay.backgroundColor).toBe("rgba(0, 0, 0, 0.8)");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Toggle page theme" }).click();
  await openDialog();

  const darkDialog = await dialogSnapshot();
  expect(darkDialog.display).toBe("grid");
  expect(darkDialog.position).toBe("relative");
  expect(darkDialog.backgroundColor).not.toBe(lightDialog.backgroundColor);
  expect(darkDialog.borderTopWidth).toBe("1px");
  expect(darkDialog.closePosition).toBe("absolute");
});

test("keeps the combobox shell visible under global legacy css imports", async ({ page }) => {
  await page.goto("/");

  const trigger = page.getByRole("combobox", { name: "Framework combobox" });
  await trigger.click();

  const content = page.locator('[data-slot="popover-content"]').first();
  await expect(content).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const getSnapshot = async () => {
    return content.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const command = element.querySelector(".tdg-command");
      const input = element.querySelector(".tdg-command-input");
      const item = element.querySelector(".tdg-command-item");

      return {
        display: style.display,
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderRadius: style.borderRadius,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        commandDisplay: command ? getComputedStyle(command).display : null,
        inputBackgroundColor: input ? getComputedStyle(input).backgroundColor : null,
        itemDisplay: item ? getComputedStyle(item).display : null,
      };
    });
  };

  const lightSnapshot = await getSnapshot();

  expect(lightSnapshot.display).toBe("block");
  expect(lightSnapshot.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightSnapshot.borderTopWidth).toBe("1px");
  expect(lightSnapshot.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightSnapshot.borderRadius).not.toBe("0px");
  expect(lightSnapshot.commandDisplay).toBe("flex");
  expect(lightSnapshot.inputBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(lightSnapshot.itemDisplay).toBe("flex");
  expect(lightSnapshot.left).toBeGreaterThanOrEqual(0);
  expect(lightSnapshot.right).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
  expect(lightSnapshot.top).toBeGreaterThanOrEqual(0);
  expect(lightSnapshot.bottom).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);

  await page.getByText("Next.js", { exact: true }).click();
  await expect(content).toBeHidden();
  await expect(trigger).toContainText("Next.js");

  await page.getByRole("button", { name: "Toggle page theme" }).click();
  await trigger.click();
  await expect(content).toBeVisible();

  const darkSnapshot = await getSnapshot();
  expect(darkSnapshot.display).toBe("block");
  expect(darkSnapshot.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(darkSnapshot.borderTopWidth).toBe("1px");
  expect(darkSnapshot.commandDisplay).toBe("flex");
  expect(darkSnapshot.itemDisplay).toBe("flex");
});

test("keeps the standalone radio group shell visible under global legacy css imports", async ({ page }) => {
  await page.goto("/");

  const group = page.getByRole("radiogroup", { name: "Example radio group" });
  await expect(group).toBeVisible();

  const optionOne = page.getByRole("radio", { name: "Option One" });
  const optionTwo = page.getByRole("radio", { name: "Option Two" });

  const getRadioSnapshot = async (locator: Locator) => {
    return locator.evaluate((element) => {
      const style = getComputedStyle(element);
      const indicator = element.querySelector('[data-slot="radio-group-indicator"]');
      const icon = element.querySelector(".tdg-radio-icon");

      return {
        display: style.display,
        width: style.width,
        height: style.height,
        borderRadius: style.borderRadius,
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        indicatorDisplay: indicator ? getComputedStyle(indicator).display : null,
        indicatorWidth: indicator ? getComputedStyle(indicator).width : null,
        indicatorHeight: indicator ? getComputedStyle(indicator).height : null,
        iconWidth: icon ? getComputedStyle(icon).width : null,
        iconHeight: icon ? getComputedStyle(icon).height : null,
      };
    });
  };

  const lightRadio = await getRadioSnapshot(optionOne);
  expect(lightRadio.display).toBe("flex");
  expect(lightRadio.width).toBe("16px");
  expect(lightRadio.height).toBe("16px");
  expect(lightRadio.borderRadius).toBe("9999px");
  expect(lightRadio.borderTopWidth).toBe("1px");
  expect(lightRadio.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightRadio.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(lightRadio.boxShadow).toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");
  expect(lightRadio.indicatorDisplay).toBe("flex");
  expect(parseFloat(lightRadio.indicatorWidth ?? "0")).toBeGreaterThanOrEqual(12);
  expect(parseFloat(lightRadio.indicatorHeight ?? "0")).toBeGreaterThanOrEqual(12);
  expect(lightRadio.iconWidth).toBe("8px");
  expect(lightRadio.iconHeight).toBe("8px");
  await expect(optionOne).toHaveAttribute("data-state", "checked");

  await page.getByText("Option Two", { exact: true }).click();
  await expect(optionOne).toHaveAttribute("data-state", "unchecked");
  await expect(optionTwo).toHaveAttribute("data-state", "checked");

  await page.getByRole("button", { name: "Toggle page theme" }).click();

  const darkRadio = await getRadioSnapshot(optionTwo);
  expect(darkRadio.display).toBe("flex");
  expect(darkRadio.width).toBe("16px");
  expect(darkRadio.height).toBe("16px");
  expect(darkRadio.borderRadius).toBe("9999px");
  expect(darkRadio.borderTopWidth).toBe("1px");
  expect(darkRadio.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(darkRadio.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(darkRadio.indicatorDisplay).toBe("flex");
  expect(parseFloat(darkRadio.indicatorWidth ?? "0")).toBeGreaterThanOrEqual(12);
  expect(parseFloat(darkRadio.indicatorHeight ?? "0")).toBeGreaterThanOrEqual(12);
  expect(darkRadio.iconWidth).toBe("8px");
  expect(darkRadio.iconHeight).toBe("8px");
});

test("keeps filter radio controls on the default shadcn shape across custom themes", async ({ page }) => {
  await page.goto("/");

  async function getRadioShellStyles() {
    await page.getByRole("button", { name: "Filter" }).first().click();

    const menu = page.getByRole("menu").last();
    const radioItem = menu.locator('[data-slot="dropdown-menu-radio-item"]').first();
    const shell = radioItem.locator('[data-slot="dropdown-menu-radio-indicator-shell"]').first();
    const indicator = shell.locator('[data-slot="dropdown-menu-radio-indicator"]').first();
    const icon = shell.locator("svg").first();

    await expect(shell).toBeVisible();
    await radioItem.hover();

    const styles = await Promise.all([
      radioItem.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      }),
      shell.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          borderTopColor: style.borderTopColor,
          backgroundColor: style.backgroundColor,
          color: style.color,
          boxShadow: style.boxShadow,
          display: style.display,
          alignItems: style.alignItems,
          justifyContent: style.justifyContent,
          hasLegacyRadioCellClass: element.classList.contains("inovua-react-toolkit-menu__cell--radio"),
          hasLegacyMenuCellClass: element.classList.contains("inovua-react-toolkit-menu__cell"),
        };
      }),
      indicator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          height: style.height,
          display: style.display,
          alignItems: style.alignItems,
          justifyContent: style.justifyContent,
        };
      }),
      icon.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          height: style.height,
          fill: style.fill,
          stroke: style.stroke,
        };
      }),
    ]);

    await page.keyboard.press("Escape");

    return { row: styles[0], shell: styles[1], indicator: styles[2], icon: styles[3] };
  }

  const defaultRadio = await getRadioShellStyles();

  await page.getByRole("button", { name: "HF Dark" }).click();
  const hfDarkRadio = await getRadioShellStyles();

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  const ikarusDarkRadio = await getRadioShellStyles();

  for (const radio of [defaultRadio, hfDarkRadio, ikarusDarkRadio]) {
    expect(radio.shell.width).toBe("16px");
    expect(radio.shell.height).toBe("16px");
    expect(radio.shell.borderRadius).toBe("9999px");
    expect(radio.shell.borderTopWidth).toBe("1px");
    expect(radio.shell.display).toBe("flex");
    expect(radio.shell.alignItems).toBe("center");
    expect(radio.shell.justifyContent).toBe("center");
    expect(radio.shell.hasLegacyRadioCellClass).toBe(false);
    expect(radio.shell.hasLegacyMenuCellClass).toBe(false);
    expect(radio.shell.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(radio.shell.boxShadow).toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");
    expect(radio.row.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(radio.shell.borderTopColor).toBe(radio.row.color);
    expect(radio.shell.color).toBe(radio.row.color);
    expect(radio.indicator.width).toBe("16px");
    expect(radio.indicator.height).toBe("16px");
    expect(radio.indicator.display).toBe("flex");
    expect(radio.indicator.alignItems).toBe("center");
    expect(radio.indicator.justifyContent).toBe("center");
    expect(radio.icon.width).toBe("8px");
    expect(radio.icon.height).toBe("8px");
    expect(radio.icon.fill).not.toBe("none");
    expect(radio.icon.stroke).not.toBe("none");
  }
});

test("keeps table alignment under hostile global table styles", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({
    content: `
      table, thead, tbody, tfoot, tr, th, td {
        display: block;
      }

      tr {
        width: min-content;
      }
    `,
  });

  const layout = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const table = root.querySelector("table");
    const thead = root.querySelector("thead");
    const headerRow = root.querySelector(".tdg-header-row");
    const headerCells = Array.from(root.querySelectorAll(".tdg-header-cell")).slice(0, 3);
    const firstBodyRow = root.querySelector("tbody .tdg-row");
    const bodyCells = firstBodyRow ? Array.from(firstBodyRow.querySelectorAll("td")).slice(0, 3) : [];

    if (!table || !thead || !headerRow || headerCells.length < 3 || bodyCells.length < 3) {
      return null;
    }

    const pick = (elements: Element[]) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        };
      });

    return {
      tableDisplay: getComputedStyle(table).display,
      theadDisplay: getComputedStyle(thead).display,
      rowDisplay: getComputedStyle(headerRow).display,
      headerCellDisplay: getComputedStyle(headerCells[0]!).display,
      bodyCellDisplay: getComputedStyle(bodyCells[0]!).display,
      headerRects: pick(headerCells),
      bodyRects: pick(bodyCells),
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.tableDisplay).toBe("table");
  expect(layout?.theadDisplay).toBe("table-header-group");
  expect(layout?.rowDisplay).toBe("table-row");
  expect(layout?.headerCellDisplay).toBe("table-cell");
  expect(layout?.bodyCellDisplay).toBe("table-cell");

  expect(new Set(layout?.headerRects.map((rect) => rect.top)).size).toBe(1);
  expect(new Set(layout?.bodyRects.map((rect) => rect.top)).size).toBe(1);

  expect(layout?.headerRects[1]?.left).toBeGreaterThan(layout?.headerRects[0]?.left ?? 0);
  expect(layout?.headerRects[2]?.left).toBeGreaterThan(layout?.headerRects[1]?.left ?? 0);
  expect(layout?.bodyRects[1]?.left).toBeGreaterThan(layout?.bodyRects[0]?.left ?? 0);
  expect(layout?.bodyRects[2]?.left).toBeGreaterThan(layout?.bodyRects[1]?.left ?? 0);
});

test("keeps filter row in flow under legacy structural theme overrides", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({
    content: `
      .InovuaReactDataGrid__header-wrapper__fill__filters,
      .tdg-filter-row {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        min-height: 41px;
      }

      .tdg-header-cell,
      .tdg-filter-cell {
        position: sticky;
        top: 0;
      }
    `,
  });

  const filterLayout = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const filterRow = root.querySelector(".tdg-filter-row");
    const headerCell = root.querySelector(".tdg-header-cell");
    const filterCell = root.querySelector(".tdg-filter-cell");

    if (!filterRow || !headerCell || !filterCell) {
      return null;
    }

    const filterStyle = getComputedStyle(filterRow);
    const headerCellStyle = getComputedStyle(headerCell);
    const filterCellStyle = getComputedStyle(filterCell);

    return {
      hasLegacyStructuralClass: filterRow.classList.contains("InovuaReactDataGrid__header-wrapper__fill__filters"),
      filterRowPosition: filterStyle.position,
      filterRowDisplay: filterStyle.display,
      filterRowMinHeight: filterStyle.minHeight,
      headerCellPosition: headerCellStyle.position,
      filterCellPosition: filterCellStyle.position,
    };
  });

  expect(filterLayout).not.toBeNull();
  expect(filterLayout?.hasLegacyStructuralClass).toBe(false);
  expect(filterLayout?.filterRowPosition).toBe("static");
  expect(filterLayout?.filterRowDisplay).toBe("table-row");
  expect(filterLayout?.filterRowMinHeight).toBe("0px");
  expect(filterLayout?.headerCellPosition).toBe("static");
  expect(filterLayout?.filterCellPosition).toBe("static");
});

test("survives a global @inovua/reactdatagrid-community/index.css import", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({ content: INOVUA_INDEX_CSS });

  const layout = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const header = root.querySelector(".InovuaReactDataGrid__header");
    const filterRow = root.querySelector(".tdg-filter-row");
    const headerCell = root.querySelector(".tdg-header-cell");
    const filterCell = root.querySelector(".tdg-filter-cell");
    const scrollArea = root.querySelector('[data-slot="scroll-area"]');
    const horizontalScrollbar = root.querySelector(
      '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'
    );
    const verticalScrollbar = root.querySelector(
      '[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'
    );
    const filterInput = root.querySelector(".inovua-react-toolkit-text-input");
    const selectTrigger = root.querySelector(".tdg-select-trigger");

    if (!header || !filterRow || !headerCell || !filterCell || !scrollArea || !filterInput || !selectTrigger) {
      return null;
    }

    const headerStyle = getComputedStyle(header);
    const filterRowStyle = getComputedStyle(filterRow);
    const headerCellStyle = getComputedStyle(headerCell);
    const filterCellStyle = getComputedStyle(filterCell);
    const filterInputStyle = getComputedStyle(filterInput);
    const selectTriggerStyle = getComputedStyle(selectTrigger);

    return {
      headerDisplay: headerStyle.display,
      filterRowPosition: filterRowStyle.position,
      filterRowDisplay: filterRowStyle.display,
      headerCellPosition: headerCellStyle.position,
      filterCellPosition: filterCellStyle.position,
      filterCellPaddingTop: filterCellStyle.paddingTop,
      filterCellPaddingRight: filterCellStyle.paddingRight,
      scrollAreaDisplay: getComputedStyle(scrollArea).display,
      horizontalScrollbarDisplay: horizontalScrollbar ? getComputedStyle(horizontalScrollbar).display : null,
      verticalScrollbarDisplay: verticalScrollbar ? getComputedStyle(verticalScrollbar).display : null,
      inputBorderRadius: filterInputStyle.borderRadius,
      inputBackgroundColor: filterInputStyle.backgroundColor,
      selectBorderRadius: selectTriggerStyle.borderRadius,
      selectPaddingTop: selectTriggerStyle.paddingTop,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout?.headerDisplay).toBe("table-header-group");
  expect(layout?.filterRowPosition).toBe("static");
  expect(layout?.filterRowDisplay).toBe("table-row");
  expect(layout?.headerCellPosition).toBe("static");
  expect(layout?.filterCellPosition).toBe("static");
  expect(layout?.filterCellPaddingTop).toBe("0px");
  expect(layout?.filterCellPaddingRight).toBe("8px");
  expect(layout?.scrollAreaDisplay).toBe("block");
  expect([null, "none"]).toContain(layout?.horizontalScrollbarDisplay ?? null);
  expect([null, "none"]).toContain(layout?.verticalScrollbarDisplay ?? null);
  expect(layout?.inputBorderRadius).not.toBe("0px");
  expect(layout?.inputBackgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(layout?.selectBorderRadius).not.toBe("0px");
  expect(layout?.selectPaddingTop).toBe("0px");

  await page.getByRole("button", { name: "Dark", exact: true }).click();

  const builtInDarkTheme = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const oddRow = root.querySelector(".InovuaReactDataGrid__row--odd");
    const rootStyle = getComputedStyle(root);

    return {
      theme: root.getAttribute("data-theme"),
      themeBase: root.getAttribute("data-theme-base"),
      rowOddVar: rootStyle.getPropertyValue("--tdg-row-odd-bg").trim(),
      rowEvenVar: rootStyle.getPropertyValue("--tdg-row-even-bg").trim(),
      inputBgVar: rootStyle.getPropertyValue("--tdg-input-bg").trim(),
      dropdownBorderVar: rootStyle.getPropertyValue("--tdg-dropdown-shell-border-color").trim(),
      oddRowBackgroundColor: oddRow ? getComputedStyle(oddRow).backgroundColor : null,
    };
  });

  expect(builtInDarkTheme?.theme).toBe("dark");
  expect(builtInDarkTheme?.themeBase).toBe("dark");
  expect(builtInDarkTheme?.rowOddVar).toBe("oklch(0.145 0 0)");
  expect(builtInDarkTheme?.rowEvenVar).toBe("oklch(0.145 0 0)");
  expect(builtInDarkTheme?.inputBgVar).toBe("oklch(0.145 0 0)");
  expect(builtInDarkTheme?.dropdownBorderVar).toBe("oklch(1 0 0 / 10%)");
  expect(builtInDarkTheme?.oddRowBackgroundColor).not.toBe("oklch(1 0 0)");
  expect(builtInDarkTheme?.oddRowBackgroundColor).not.toBe("rgb(255, 255, 255)");
  expect(builtInDarkTheme?.oddRowBackgroundColor).not.toBe("rgba(255, 255, 255, 1)");

  await page.getByRole("button", { name: "Filter" }).first().click();
  await page.waitForTimeout(300);

  const darkMenuChrome = await page.locator('[data-slot="dropdown-menu-content"]').first().evaluate((menu) => {
    const style = getComputedStyle(menu);

    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      color: style.color,
      opacity: style.opacity,
    };
  });

  expect(darkMenuChrome).toEqual({
    backgroundColor: "oklch(0.205 0 0)",
    borderColor: "oklch(1 0 0 / 0.1)",
    color: "oklch(0.985 0 0)",
    opacity: "1",
  });

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ikarus Light" }).click();

  const customThemeLayout = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const filterRow = root.querySelector(".tdg-filter-row");
    const headerCell = root.querySelector(".tdg-header-cell");
    const filterCell = root.querySelector(".tdg-filter-cell");
    const scrollArea = root.querySelector('[data-slot="scroll-area"]');

    if (!filterRow || !headerCell || !filterCell || !scrollArea) {
      return null;
    }

    return {
      filterRowPosition: getComputedStyle(filterRow).position,
      filterRowDisplay: getComputedStyle(filterRow).display,
      headerCellPosition: getComputedStyle(headerCell).position,
      filterCellPosition: getComputedStyle(filterCell).position,
      scrollAreaDisplay: getComputedStyle(scrollArea).display,
    };
  });

  expect(customThemeLayout).toEqual({
    filterRowPosition: "static",
    filterRowDisplay: "table-row",
    headerCellPosition: "static",
    filterCellPosition: "static",
    scrollAreaDisplay: "block",
  });
});

test("keeps grid buttons styled under hostile global button styles", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({
    content: `
      button,
      [type="button"],
      [type="submit"],
      [type="reset"] {
        -webkit-appearance: auto;
        appearance: auto;
        background: rgb(239, 239, 239);
        border: 2px outset rgb(118, 118, 118);
        border-radius: 0;
        display: inline-block;
        font-family: serif;
        padding: 2px 6px;
      }
    `,
  });

  const filterButton = page.getByRole("button", { name: "Filter" }).first();
  await expect(filterButton).toBeVisible();

  const buttonStyles = await filterButton.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      display: style.display,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      iconWrap: Boolean(element.querySelector(".inovua-react-toolkit-button__icon-wrap")),
      textWrap: Boolean(element.querySelector(".inovua-react-toolkit-button__text")),
      hasLtrClass: element.classList.contains("inovua-react-toolkit-button--ltr"),
      hasIconClass: element.classList.contains("inovua-react-toolkit-button--has-icon"),
      hasNoChildrenClass: element.classList.contains("inovua-react-toolkit-button--no-children"),
    };
  });

  expect(buttonStyles.display).not.toBe("block");
  expect(buttonStyles.borderRadius).not.toBe("0px");
  expect(buttonStyles.backgroundColor).not.toBe("rgb(239, 239, 239)");
  expect(buttonStyles.iconWrap).toBe(true);
  expect(buttonStyles.textWrap).toBe(false);
  expect(buttonStyles.hasLtrClass).toBe(true);
  expect(buttonStyles.hasIconClass).toBe(true);
  expect(buttonStyles.hasNoChildrenClass).toBe(true);
});

test("keeps grid-owned structure under broad host css overrides", async ({ page }) => {
  await page.goto("/");

  await page.addStyleTag({
    content: `
      div,
      table,
      thead,
      tbody,
      tfoot,
      tr,
      th,
      td,
      button,
      input,
      p,
      svg {
        font-family: "Times New Roman", serif !important;
        font-size: 20px !important;
        line-height: 2 !important;
        letter-spacing: 2px !important;
      }

      div {
        display: flex !important;
        min-width: max-content !important;
      }

      table {
        border-collapse: collapse !important;
        border-spacing: 18px !important;
      }

      thead,
      tbody,
      tfoot,
      tr,
      th,
      td {
        display: block !important;
        padding: 17px !important;
      }

      button,
      input {
        appearance: auto !important;
        background: rgb(255, 255, 0) !important;
        border: 3px solid rgb(255, 0, 0) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 9px !important;
        padding: 11px !important;
      }

      p {
        margin: 24px 0 !important;
      }
    `,
  });

  const snapshot = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const frame = root.querySelector(".tdg-frame");
    const surface = root.querySelector(".tdg-surface");
    const table = root.querySelector(".tdg-table");
    const headerRow = root.querySelector(".tdg-header-row");
    const headerCell = root.querySelector(".tdg-header-cell");
    const filterInput = root.querySelector(".inovua-react-toolkit-text-input");
    const filterInputInner = root.querySelector(".inovua-react-toolkit-text-input__input");
    const selectTrigger = root.querySelector(".tdg-select-trigger");
    const firstParagraph = root.querySelector("tbody p");

    if (
      !frame ||
      !surface ||
      !table ||
      !headerRow ||
      !headerCell ||
      !filterInput ||
      !filterInputInner ||
      !selectTrigger
    ) {
      return null;
    }

    const frameStyle = getComputedStyle(frame);
    const surfaceStyle = getComputedStyle(surface);
    const rootStyle = getComputedStyle(root);
    const tableStyle = getComputedStyle(table);
    const headerRowStyle = getComputedStyle(headerRow);
    const headerCellStyle = getComputedStyle(headerCell);
    const filterInputStyle = getComputedStyle(filterInput);
    const filterInputInnerStyle = getComputedStyle(filterInputInner);
    const selectTriggerStyle = getComputedStyle(selectTrigger);
    const paragraphStyle = firstParagraph ? getComputedStyle(firstParagraph) : null;

    return {
      rootFontFamily: rootStyle.fontFamily,
      frameDisplay: frameStyle.display,
      surfaceDisplay: surfaceStyle.display,
      tableDisplay: tableStyle.display,
      tableBorderCollapse: tableStyle.borderCollapse,
      tableBorderSpacing: tableStyle.borderSpacing,
      headerRowDisplay: headerRowStyle.display,
      headerCellDisplay: headerCellStyle.display,
      headerCellPaddingLeft: headerCellStyle.paddingLeft,
      headerCellPaddingTop: headerCellStyle.paddingTop,
      filterInputBorderRadius: filterInputStyle.borderRadius,
      filterInputBackgroundColor: filterInputStyle.backgroundColor,
      filterInputMarginTop: filterInputStyle.marginTop,
      filterInputInnerBorderTopWidth: filterInputInnerStyle.borderTopWidth,
      filterInputInnerPaddingTop: filterInputInnerStyle.paddingTop,
      filterInputInnerBackgroundColor: filterInputInnerStyle.backgroundColor,
      selectTriggerBorderRadius: selectTriggerStyle.borderRadius,
      selectTriggerBackgroundColor: selectTriggerStyle.backgroundColor,
      selectTriggerMarginTop: selectTriggerStyle.marginTop,
      paragraphMarginTop: paragraphStyle?.marginTop ?? null,
    };
  });

  expect(snapshot).not.toBeNull();
  expect(snapshot?.rootFontFamily).not.toContain("Times New Roman");
  expect(snapshot?.frameDisplay).toBe("block");
  expect(snapshot?.surfaceDisplay).toBe("block");
  expect(snapshot?.tableDisplay).toBe("table");
  expect(snapshot?.tableBorderCollapse).toBe("separate");
  expect(["0px", "0px 0px"]).toContain(snapshot?.tableBorderSpacing ?? "");
  expect(snapshot?.headerRowDisplay).toBe("table-row");
  expect(snapshot?.headerCellDisplay).toBe("table-cell");
  expect(snapshot?.headerCellPaddingLeft).toBe("8px");
  expect(snapshot?.headerCellPaddingTop).toBe("0px");
  expect(snapshot?.filterInputBorderRadius).not.toBe("0px");
  expect(snapshot?.filterInputBackgroundColor).not.toBe("rgb(255, 255, 0)");
  expect(snapshot?.filterInputMarginTop).toBe("0px");
  expect(snapshot?.filterInputInnerBorderTopWidth).toBe("0px");
  expect(snapshot?.filterInputInnerPaddingTop).toBe("0px");
  expect(snapshot?.filterInputInnerBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(snapshot?.selectTriggerBorderRadius).not.toBe("0px");
  expect(snapshot?.selectTriggerBackgroundColor).not.toBe("rgb(255, 255, 0)");
  expect(snapshot?.selectTriggerMarginTop).toBe("0px");
  expect([null, "0px"]).toContain(snapshot?.paragraphMarginTop ?? null);
});

test("supports real ikarus-dark theme imports for legacy inputs, selects, and menus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ikarus Dark" }).click();

  const shell = await page.locator(".InovuaReactDataGrid.tdg-root").first().evaluate((root) => {
    const frame = root.querySelector(".tdg-frame");
    const surface = root.querySelector(".tdg-surface");
    if (!frame || !surface) {
      return null;
    }

    const rootStyle = getComputedStyle(root);
    const frameStyle = getComputedStyle(frame);
    const surfaceStyle = getComputedStyle(surface);
    const rootRect = root.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    return {
      rootBackgroundColor: rootStyle.backgroundColor,
      rootBorderTopWidth: rootStyle.borderTopWidth,
      rootBorderBottomWidth: rootStyle.borderBottomWidth,
      rootPaddingTop: rootStyle.paddingTop,
      rootPaddingBottom: rootStyle.paddingBottom,
      frameBorderTopWidth: frameStyle.borderTopWidth,
      frameBorderTopColor: frameStyle.borderTopColor,
      frameBackgroundColor: frameStyle.backgroundColor,
      surfaceBackgroundColor: surfaceStyle.backgroundColor,
      heightDelta: Math.abs(rootRect.height - frameRect.height),
    };
  });

  expect(shell).not.toBeNull();
  expect(shell?.rootBackgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(shell?.rootBorderTopWidth).toBe("0px");
  expect(shell?.rootBorderBottomWidth).toBe("0px");
  expect(shell?.rootPaddingTop).toBe("0px");
  expect(shell?.rootPaddingBottom).toBe("0px");
  expect(shell?.frameBorderTopWidth).toBe("1px");
  expect(shell?.frameBorderTopColor).toBe("rgb(56, 56, 56)");
  expect(shell?.frameBackgroundColor).toBe("rgb(33, 33, 33)");
  expect(shell?.surfaceBackgroundColor).toBe("rgb(33, 33, 33)");
  expect(shell?.heightDelta ?? 1).toBeLessThanOrEqual(0.5);

  const filterInput = page.locator(".inovua-react-toolkit-text-input.inovua-react-toolkit-text-input--theme-ikarus-dark").first();

  await expect.poll(async () => {
    return filterInput.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    });
  }).toEqual({
    backgroundColor: "rgb(70, 77, 86)",
    color: "rgb(155, 167, 180)",
    borderColor: "rgb(70, 77, 86)",
    borderRadius: "8px",
    boxShadow:
      "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
  });

  const selectTrigger = page.locator(".inovua-react-toolkit-combo-box.inovua-react-toolkit-combo-box--theme-ikarus-dark").first();
  await expect(selectTrigger).toBeVisible();

  const selectShell = await selectTrigger.evaluate((element) => {
    const style = getComputedStyle(element);
    const value = element.querySelector(".inovua-react-toolkit-combo-box__value");
    const tools = element.querySelector(".inovua-react-toolkit-combo-box__tools");
    return {
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
      paddingTop: style.paddingTop,
      alignItems: style.alignItems,
      valueAlignItems: value ? getComputedStyle(value).alignItems : null,
      toolsMarginBottom: tools ? getComputedStyle(tools).marginBottom : null,
      toolsAlignItems: tools ? getComputedStyle(tools).alignItems : null,
    };
  });

  expect(selectShell.borderRadius).toBe("8px");
  expect(selectShell.boxShadow).toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");
  expect(selectShell.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(selectShell.paddingTop).toBe("0px");
  expect(selectShell.alignItems).toBe("center");
  expect(selectShell.valueAlignItems).toBe("center");
  expect(selectShell.toolsMarginBottom).toBe("0px");
  expect(selectShell.toolsAlignItems).toBe("center");

  await page.locator(".tdg-select-trigger.inovua-react-toolkit-combo-box").first().click();

  const selectedOption = page.locator(".inovua-react-toolkit-combo-box__list__item--selected").first();
  await expect(selectedOption).toBeVisible();

  const selectedOptionStyles = await selectedOption.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });

  expect(selectedOptionStyles.backgroundColor).not.toBe("rgb(255, 255, 255)");
  expect(selectedOptionStyles.color).not.toBe("rgb(0, 0, 0)");

  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Filter" }).first().click();

  await expect(
    page.locator(".inovua-react-toolkit-menu__row.inovua-react-toolkit-menu__row--checked").first()
  ).toBeVisible();
});
