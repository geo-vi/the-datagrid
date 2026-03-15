import { expect, test } from "@playwright/test";

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
  await expect(grid.locator('[data-slot="scroll-area-scrollbar"]').first()).toBeVisible();

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
    return {
      borderTopWidth: style.borderTopWidth,
      borderRightWidth: style.borderRightWidth,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
    };
  });

  expect(scrollAreaStyles).toEqual({
    borderTopWidth: "0px",
    borderRightWidth: "0px",
    borderBottomWidth: "0px",
    borderLeftWidth: "0px",
  });

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
    await page.getByRole("combobox").first().click();

    const chrome = await Promise.all([
      page.locator(".tdg-select-content.inovua-react-toolkit-combo-box__list").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
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
    expect(listChrome.content).toEqual(defaultList.content);
    expect(listChrome.item).toEqual(defaultList.item);
  }
});

test("keeps custom theme dropdown structure aligned with the default shell", async ({ page }) => {
  await page.goto("/");

  const getMenuChrome = async () => {
    await page.getByRole("button", { name: "Filter" }).first().click();

    const menu = page.locator(".tdg-dropdown-content.inovua-react-toolkit-menu").last();
    const clearItem = page.getByRole("menuitem", { name: "Clear" }).last();
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
          boxShadow: style.boxShadow,
        };
      }),
      clearItem.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          minHeight: style.minHeight,
          borderRadius: style.borderRadius,
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
      cell: chrome[2],
      separator: chrome[3],
    };
  };

  const defaultMenu = await getMenuChrome();

  await page.getByRole("button", { name: "HF Dark" }).click();
  const hfDarkMenu = await getMenuChrome();

  await page.getByRole("button", { name: "Ikarus Dark" }).click();
  const ikarusDarkMenu = await getMenuChrome();

  for (const menuChrome of [hfDarkMenu, ikarusDarkMenu]) {
    expect(menuChrome.content.paddingTop).toBe(defaultMenu.content.paddingTop);
    expect(menuChrome.content.paddingRight).toBe(defaultMenu.content.paddingRight);
    expect(menuChrome.content.paddingBottom).toBe(defaultMenu.content.paddingBottom);
    expect(menuChrome.content.paddingLeft).toBe(defaultMenu.content.paddingLeft);
    expect(menuChrome.content.borderRadius).toBe(defaultMenu.content.borderRadius);
    expect(menuChrome.content.borderTopWidth).toBe(defaultMenu.content.borderTopWidth);
    expect(menuChrome.content.boxShadow).toContain("rgba(0, 0, 0, 0.1)");

    expect(menuChrome.item).toEqual(defaultMenu.item);
    expect(menuChrome.cell).toEqual(defaultMenu.cell);
    expect(menuChrome.separator).toEqual(defaultMenu.separator);
  }
});

test("keeps filter radio controls on the default shadcn shape across custom themes", async ({ page }) => {
  await page.goto("/");

  async function getRadioShellStyles() {
    await page.getByRole("button", { name: "Filter" }).first().click();

    const menu = page.getByRole("menu").last();
    const shell = menu.locator('[data-slot="dropdown-menu-radio-indicator-shell"]').first();
    const indicator = shell.locator('[data-slot="dropdown-menu-radio-indicator"]').first();
    const icon = shell.locator("svg").first();

    await expect(shell).toBeVisible();

    const styles = await Promise.all([
      shell.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          backgroundColor: style.backgroundColor,
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

    return { shell: styles[0], indicator: styles[1], icon: styles[2] };
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

test("supports real ikarus-dark theme imports for legacy inputs, selects, and menus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ikarus Dark" }).click();

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

  await page.getByRole("combobox").first().click();

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
