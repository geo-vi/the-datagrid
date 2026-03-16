import * as React from "react"

type LegacyVarMatcher = {
  cssVar: string
  property:
    | "background"
    | "color"
    | "borderColor"
    | "borderBottomColor"
    | "borderRightColor"
    | "borderTopColor"
  matches: (selector: string, themeSelector: string) => boolean
}

const LEGACY_THEME_MATCHERS: LegacyVarMatcher[] = [
  {
    cssVar: "--tdg-color-background",
    property: "background",
    matches: (selector, themeSelector) =>
      selector
        .split(",")
        .some((part) => part.trim() === themeSelector),
  },
  {
    cssVar: "--tdg-grid-bg",
    property: "background",
    matches: (selector, themeSelector) =>
      selector
        .split(",")
        .some((part) => part.trim() === themeSelector),
  },
  {
    cssVar: "--tdg-color-foreground",
    property: "color",
    matches: (selector, themeSelector) =>
      selector
        .split(",")
        .some((part) => part.trim() === themeSelector),
  },
  {
    cssVar: "--tdg-color-border",
    property: "borderColor",
    matches: (selector, themeSelector) =>
      selector
        .split(",")
        .some((part) => part.trim() === themeSelector),
  },
  {
    cssVar: "--tdg-header-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__header") &&
      !selector.includes("InovuaReactDataGrid__header-group") &&
      !selector.includes("InovuaReactDataGrid__header-wrapper__fill") &&
      !selector.includes("InovuaReactDataGrid__column-header"),
  },
  {
    cssVar: "--tdg-header-border-color",
    property: "borderRightColor",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__column-header--show-border-right"),
  },
  {
    cssVar: "--tdg-filter-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__column-header__filter-wrapper"),
  },
  {
    cssVar: "--tdg-filter-border-color",
    property: "borderTopColor",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__column-header__filter-wrapper"),
  },
  {
    cssVar: "--tdg-cell-border-color",
    property: "borderRightColor",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__cell--show-border-right"),
  },
  {
    cssVar: "--tdg-row-odd-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--odd") &&
      !selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__row-hover-target:hover"),
  },
  {
    cssVar: "--tdg-row-even-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--even") &&
      !selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__row-hover-target:hover"),
  },
  {
    cssVar: "--tdg-row-odd-selected-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--odd") &&
      selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__row-hover-target:hover"),
  },
  {
    cssVar: "--tdg-row-even-selected-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--even") &&
      selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__row-hover-target:hover"),
  },
  {
    cssVar: "--tdg-row-odd-hover-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--odd") &&
      selector.includes("InovuaReactDataGrid__row-hover-target:hover") &&
      !selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__cell--over"),
  },
  {
    cssVar: "--tdg-row-even-hover-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--even") &&
      selector.includes("InovuaReactDataGrid__row-hover-target:hover") &&
      !selector.includes("InovuaReactDataGrid__row--selected") &&
      !selector.includes("InovuaReactDataGrid__cell--over"),
  },
  {
    cssVar: "--tdg-row-odd-selected-hover-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--odd") &&
      selector.includes("InovuaReactDataGrid__row--selected") &&
      selector.includes("InovuaReactDataGrid__row-hover-target:hover") &&
      !selector.includes("InovuaReactDataGrid__cell--over"),
  },
  {
    cssVar: "--tdg-row-even-selected-hover-bg",
    property: "background",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row--even") &&
      selector.includes("InovuaReactDataGrid__row--selected") &&
      selector.includes("InovuaReactDataGrid__row-hover-target:hover") &&
      !selector.includes("InovuaReactDataGrid__cell--over"),
  },
  {
    cssVar: "--tdg-row-active-color",
    property: "color",
    matches: (selector) =>
      selector.includes("InovuaReactDataGrid__row-hover-target:hover") &&
      !selector.includes("InovuaReactDataGrid__cell--over"),
  },
]

function visitRules(
  rules: CSSRuleList | undefined,
  callback: (rule: CSSStyleRule) => void
) {
  if (!rules) return

  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      callback(rule)
      continue
    }

    if ("cssRules" in rule) {
      try {
        visitRules(rule.cssRules as CSSRuleList, callback)
      } catch {
        // Ignore inaccessible nested rulesheets.
      }
    }
  }
}

function getStyleValue(rule: CSSStyleRule, property: LegacyVarMatcher["property"]) {
  const probeBorderColor = (sourceProperty: "border-right" | "border-top" | "border") => {
    const shorthand = rule.style.getPropertyValue(sourceProperty)
    if (!shorthand || typeof document === "undefined") return ""

    const probe = document.createElement("div")
    if (sourceProperty === "border-right") {
      probe.style.borderRight = shorthand
      return probe.style.borderRightColor || ""
    }

    if (sourceProperty === "border-top") {
      probe.style.borderTop = shorthand
      return probe.style.borderTopColor || ""
    }

    probe.style.border = shorthand
    if (property === "borderRightColor") return probe.style.borderRightColor || ""
    if (property === "borderTopColor") return probe.style.borderTopColor || ""
    if (property === "borderBottomColor") return probe.style.borderBottomColor || ""
    return ""
  }

  if (property === "borderBottomColor") {
    return (
      rule.style.getPropertyValue("border-bottom-color") ||
      rule.style.borderBottomColor ||
      probeBorderColor("border") ||
      ""
    )
  }

  if (property === "borderColor") {
    return (
      rule.style.getPropertyValue("border-color") ||
      rule.style.borderColor ||
      probeBorderColor("border") ||
      ""
    )
  }

  if (property === "borderRightColor") {
    return (
      rule.style.getPropertyValue("border-right-color") ||
      rule.style.borderRightColor ||
      probeBorderColor("border-right") ||
      probeBorderColor("border") ||
      ""
    )
  }

  if (property === "borderTopColor") {
    return (
      rule.style.getPropertyValue("border-top-color") ||
      rule.style.borderTopColor ||
      probeBorderColor("border-top") ||
      probeBorderColor("border") ||
      ""
    )
  }

  return rule.style.getPropertyValue(property) || ""
}

function getComputedBorderColor(
  element: HTMLElement | null,
  candidates: Array<"borderRightColor" | "borderBottomColor" | "borderColor">
) {
  if (!element) return ""

  const style = window.getComputedStyle(element)

  for (const candidate of candidates) {
    const value = style[candidate]
    if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
      return value
    }
  }

  return ""
}

function isMissingColorValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase()

  return (
    normalized.length === 0 ||
    normalized === "initial" ||
    normalized === "inherit" ||
    normalized === "unset" ||
    normalized === "revert" ||
    normalized === "revert-layer" ||
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "rgb(0 0 0 / 0)" ||
    normalized === "rgb(0, 0, 0, 0)"
  )
}

function selectorIncludesClass(ruleSelector: string, classSelector: string) {
  return ruleSelector
    .split(",")
    .some((part) => part.trim().includes(classSelector))
}

const LEGACY_BRIDGE_CSS_VARS = [
  ...new Set(
    LEGACY_THEME_MATCHERS.map((matcher) => matcher.cssVar).concat([
      "--tdg-grid-border-color",
      "--tdg-header-color",
      "--tdg-filter-color",
      "--tdg-input-bg",
      "--tdg-input-color",
      "--tdg-input-border-color",
      "--tdg-input-border-color-hover",
      "--tdg-input-border-color-focus",
      "--tdg-select-bg",
      "--tdg-select-color",
      "--tdg-select-list-bg",
      "--tdg-select-list-color",
      "--tdg-select-border-color",
      "--tdg-select-border-color-hover",
      "--tdg-select-border-color-focus",
      "--tdg-select-shell-bg",
      "--tdg-select-shell-color",
      "--tdg-select-shell-border-color",
      "--tdg-select-shell-border-color-hover",
      "--tdg-select-shell-border-color-focus",
      "--tdg-dropdown-bg",
      "--tdg-dropdown-color",
      "--tdg-dropdown-border-color",
      "--tdg-dropdown-shell-bg",
      "--tdg-dropdown-shell-color",
      "--tdg-dropdown-shell-border-color",
      "--tdg-dropdown-label-color",
      "--tdg-row-active-color",
    ])
  ),
] as const

export function useLegacyThemeBridge(
  rootElement: HTMLElement | null,
  themeClassSuffix: string,
  enabled = true
) {
  React.useLayoutEffect(() => {
    if (!rootElement || typeof document === "undefined") return

    for (const cssVar of LEGACY_BRIDGE_CSS_VARS) {
      rootElement.style.removeProperty(cssVar)
    }

    if (!enabled) return

    const themeSelector = `.InovuaReactDataGrid--theme-${themeClassSuffix}`
    const inputThemeSelector = `.inovua-react-toolkit-text-input--theme-${themeClassSuffix}`
    const selectThemeSelector = `.inovua-react-toolkit-combo-box--theme-${themeClassSuffix}`
    const selectListThemeSelector = `.inovua-react-toolkit-combo-box__list--theme-${themeClassSuffix}`
    const dropdownThemeSelector = `.inovua-react-toolkit-menu--theme-${themeClassSuffix}`
    const found = new Set<string>()

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined

      try {
        rules = sheet.cssRules
      } catch {
        continue
      }

      visitRules(rules, (rule) => {
        const selectorText = rule.selectorText

        if (!selectorText.includes(themeSelector)) {
          if (selectorIncludesClass(selectorText, inputThemeSelector)) {
            const background = getStyleValue(rule, "background").trim()
            const color = getStyleValue(rule, "color").trim()
            const borderColor = getStyleValue(rule, "borderColor").trim()

            if (background && !isMissingColorValue(background)) {
              rootElement.style.setProperty("--tdg-input-bg", background)
            }

            if (color && !isMissingColorValue(color)) {
              rootElement.style.setProperty("--tdg-input-color", color)
            }

            if (borderColor && !isMissingColorValue(borderColor)) {
              rootElement.style.setProperty("--tdg-input-border-color", borderColor)
              rootElement.style.setProperty("--tdg-input-border-color-hover", borderColor)
              rootElement.style.setProperty("--tdg-input-border-color-focus", borderColor)
            }
          }

          if (selectorIncludesClass(selectorText, selectThemeSelector)) {
            const background = getStyleValue(rule, "background").trim()
            const color = getStyleValue(rule, "color").trim()
            const borderColor = getStyleValue(rule, "borderColor").trim()

            if (background && !isMissingColorValue(background)) {
              rootElement.style.setProperty("--tdg-select-bg", background)
            }

            if (color && !isMissingColorValue(color)) {
              rootElement.style.setProperty("--tdg-select-color", color)
            }

            if (borderColor && !isMissingColorValue(borderColor)) {
              rootElement.style.setProperty("--tdg-select-border-color", borderColor)
              rootElement.style.setProperty("--tdg-select-border-color-hover", borderColor)
              rootElement.style.setProperty("--tdg-select-border-color-focus", borderColor)
            }
          }

          if (selectorIncludesClass(selectorText, selectListThemeSelector)) {
            const background = getStyleValue(rule, "background").trim()
            const color = getStyleValue(rule, "color").trim()
            const borderColor = getStyleValue(rule, "borderColor").trim()

            if (background && !isMissingColorValue(background)) {
              rootElement.style.setProperty("--tdg-select-list-bg", background)
            }

            if (color && !isMissingColorValue(color)) {
              rootElement.style.setProperty("--tdg-select-list-color", color)
            }

            if (borderColor && !isMissingColorValue(borderColor)) {
              rootElement.style.setProperty("--tdg-dropdown-border-color", borderColor)
            }
          }

          if (selectorIncludesClass(selectorText, dropdownThemeSelector)) {
            const background = getStyleValue(rule, "background").trim()
            const color = getStyleValue(rule, "color").trim()
            const borderColor = getStyleValue(rule, "borderColor").trim()

            if (background && !isMissingColorValue(background)) {
              rootElement.style.setProperty("--tdg-dropdown-bg", background)
            }

            if (color && !isMissingColorValue(color)) {
              rootElement.style.setProperty("--tdg-dropdown-color", color)
            }

            if (borderColor && !isMissingColorValue(borderColor)) {
              rootElement.style.setProperty("--tdg-dropdown-border-color", borderColor)
            }
          }

          return
        }

        for (const matcher of LEGACY_THEME_MATCHERS) {
          if (found.has(matcher.cssVar) || !matcher.matches(selectorText, themeSelector)) continue

          const value = getStyleValue(rule, matcher.property).trim()
          if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") continue

          rootElement.style.setProperty(matcher.cssVar, value)
          found.add(matcher.cssVar)

          if (matcher.cssVar === "--tdg-header-border-color") {
            rootElement.style.setProperty("--tdg-grid-border-color", value)
          }
        }
      })
    }

    const foreground = rootElement.style.getPropertyValue("--tdg-color-foreground").trim()
    if (foreground) {
      rootElement.style.setProperty("--tdg-header-color", foreground)
      rootElement.style.setProperty("--tdg-filter-color", foreground)
      rootElement.style.setProperty("--tdg-input-color", foreground)
      rootElement.style.setProperty("--tdg-select-color", foreground)
      rootElement.style.setProperty("--tdg-select-list-color", foreground)
      rootElement.style.setProperty("--tdg-dropdown-color", foreground)
      rootElement.style.setProperty("--tdg-dropdown-label-color", foreground)
      rootElement.style.setProperty("--tdg-row-active-color", foreground)
    }

    const background = rootElement.style.getPropertyValue("--tdg-color-background").trim()
    if (background) {
      rootElement.style.setProperty("--tdg-grid-bg", rootElement.style.getPropertyValue("--tdg-grid-bg").trim() || background)
      rootElement.style.setProperty("--tdg-filter-bg", rootElement.style.getPropertyValue("--tdg-filter-bg").trim() || background)
      rootElement.style.setProperty("--tdg-input-bg", rootElement.style.getPropertyValue("--tdg-input-bg").trim() || background)
      rootElement.style.setProperty("--tdg-select-bg", rootElement.style.getPropertyValue("--tdg-select-bg").trim() || background)
      rootElement.style.setProperty("--tdg-select-list-bg", rootElement.style.getPropertyValue("--tdg-select-list-bg").trim() || background)
      rootElement.style.setProperty("--tdg-dropdown-bg", rootElement.style.getPropertyValue("--tdg-dropdown-bg").trim() || background)
    }

    const border = rootElement.style.getPropertyValue("--tdg-color-border").trim()
    if (border) {
      rootElement.style.setProperty("--tdg-grid-border-color", rootElement.style.getPropertyValue("--tdg-grid-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-header-border-color", rootElement.style.getPropertyValue("--tdg-header-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-filter-border-color", rootElement.style.getPropertyValue("--tdg-filter-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-cell-border-color", rootElement.style.getPropertyValue("--tdg-cell-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-input-border-color", rootElement.style.getPropertyValue("--tdg-input-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-input-border-color-hover", rootElement.style.getPropertyValue("--tdg-input-border-color-hover").trim() || border)
      rootElement.style.setProperty("--tdg-input-border-color-focus", rootElement.style.getPropertyValue("--tdg-input-border-color-focus").trim() || border)
      rootElement.style.setProperty("--tdg-select-border-color", rootElement.style.getPropertyValue("--tdg-select-border-color").trim() || border)
      rootElement.style.setProperty("--tdg-select-border-color-hover", rootElement.style.getPropertyValue("--tdg-select-border-color-hover").trim() || border)
      rootElement.style.setProperty("--tdg-select-border-color-focus", rootElement.style.getPropertyValue("--tdg-select-border-color-focus").trim() || border)
      rootElement.style.setProperty("--tdg-dropdown-border-color", rootElement.style.getPropertyValue("--tdg-dropdown-border-color").trim() || border)
    }

    const inputBackground = rootElement.style.getPropertyValue("--tdg-input-bg").trim()
    const inputBorderColor = rootElement.style.getPropertyValue("--tdg-input-border-color").trim()
    const normalizedInputBorderColor =
      border ||
      (isMissingColorValue(inputBorderColor) ? "" : inputBorderColor)

    if (normalizedInputBorderColor) {
      rootElement.style.setProperty("--tdg-input-border-color", normalizedInputBorderColor)
      rootElement.style.setProperty("--tdg-input-border-color-hover", normalizedInputBorderColor)
      rootElement.style.setProperty("--tdg-input-border-color-focus", normalizedInputBorderColor)
    }

    const selectBackground = rootElement.style.getPropertyValue("--tdg-select-bg").trim()
    const selectColor = rootElement.style.getPropertyValue("--tdg-select-color").trim()
    rootElement.style.setProperty(
      "--tdg-select-shell-bg",
      selectBackground || inputBackground || background
    )
    rootElement.style.setProperty(
      "--tdg-select-shell-color",
      selectColor || foreground
    )

    const selectBorderColor = rootElement.style.getPropertyValue("--tdg-select-border-color").trim()

    // Keep select shells on the grid-owned border chrome even when legacy combo-box
    // themes provide their own border accents. This avoids the old theme taking over
    // hover/focus borders in custom themes like ikarus-light.
    const normalizedSelectBorderColor =
      border ||
      inputBorderColor ||
      (isMissingColorValue(selectBorderColor) ? "" : selectBorderColor)
    const normalizedSelectBorderColorHover = normalizedSelectBorderColor
    const normalizedSelectBorderColorFocus = normalizedSelectBorderColor

    if (normalizedSelectBorderColor) {
      rootElement.style.setProperty("--tdg-select-border-color", normalizedSelectBorderColor)
      rootElement.style.setProperty("--tdg-select-shell-border-color", normalizedSelectBorderColor)
    }
    if (normalizedSelectBorderColorHover) {
      rootElement.style.setProperty("--tdg-select-border-color-hover", normalizedSelectBorderColorHover)
      rootElement.style.setProperty("--tdg-select-shell-border-color-hover", normalizedSelectBorderColorHover)
    }
    if (normalizedSelectBorderColorFocus) {
      rootElement.style.setProperty("--tdg-select-border-color-focus", normalizedSelectBorderColorFocus)
      rootElement.style.setProperty("--tdg-select-shell-border-color-focus", normalizedSelectBorderColorFocus)
    }

    const dropdownBackground = rootElement.style.getPropertyValue("--tdg-dropdown-bg").trim()
    const dropdownColor = rootElement.style.getPropertyValue("--tdg-dropdown-color").trim()
    const dropdownBorderColor = rootElement.style.getPropertyValue("--tdg-dropdown-border-color").trim()

    rootElement.style.setProperty(
      "--tdg-dropdown-shell-bg",
      dropdownBackground || rootElement.style.getPropertyValue("--tdg-select-list-bg").trim() || background
    )
    rootElement.style.setProperty(
      "--tdg-dropdown-shell-color",
      dropdownColor || selectColor || foreground
    )

    const normalizedDropdownBorderColor = isMissingColorValue(dropdownBorderColor)
      ? normalizedSelectBorderColor || normalizedInputBorderColor || border
      : border || normalizedSelectBorderColor || normalizedInputBorderColor || dropdownBorderColor

    if (normalizedDropdownBorderColor) {
      rootElement.style.setProperty("--tdg-dropdown-border-color", normalizedDropdownBorderColor)
      rootElement.style.setProperty("--tdg-dropdown-shell-border-color", normalizedDropdownBorderColor)
    }

    const headerElement = rootElement.querySelector<HTMLElement>(".InovuaReactDataGrid__column-header")
    if (!rootElement.style.getPropertyValue("--tdg-header-bg").trim() && headerElement) {
      const headerStyle = window.getComputedStyle(headerElement)
      if (headerStyle.backgroundColor && headerStyle.backgroundColor !== "rgba(0, 0, 0, 0)") {
        rootElement.style.setProperty("--tdg-header-bg", headerStyle.backgroundColor)
      }
    }

    if (!rootElement.style.getPropertyValue("--tdg-header-border-color").trim() && headerElement) {
      const headerBorderColor =
        getComputedBorderColor(headerElement, ["borderRightColor", "borderBottomColor", "borderColor"]) ||
        ""

      if (headerBorderColor) {
        rootElement.style.setProperty("--tdg-header-border-color", headerBorderColor)
        rootElement.style.setProperty("--tdg-grid-border-color", headerBorderColor)
      }
    }

    const filterElement = rootElement.querySelector<HTMLElement>(".InovuaReactDataGrid__filter-cell")
    if (!rootElement.style.getPropertyValue("--tdg-filter-border-color").trim()) {
      const filterBorderColor = getComputedBorderColor(filterElement, ["borderRightColor", "borderBottomColor", "borderColor"])
      if (filterBorderColor) {
        rootElement.style.setProperty("--tdg-filter-border-color", filterBorderColor)
      } else {
        const headerBorderColor = rootElement.style.getPropertyValue("--tdg-header-border-color").trim()
        if (headerBorderColor) {
          rootElement.style.setProperty("--tdg-filter-border-color", headerBorderColor)
        }
      }
    }

    const cellElement = rootElement.querySelector<HTMLElement>(
      ".InovuaReactDataGrid__cell--show-border-right:not(.InovuaReactDataGrid__cell--last), .InovuaReactDataGrid__cell"
    )
    if (!rootElement.style.getPropertyValue("--tdg-cell-border-color").trim()) {
      const cellBorderColor = getComputedBorderColor(cellElement, ["borderRightColor", "borderBottomColor", "borderColor"])
      if (cellBorderColor) {
        rootElement.style.setProperty("--tdg-cell-border-color", cellBorderColor)
      } else {
        const headerBorderColor = rootElement.style.getPropertyValue("--tdg-header-border-color").trim()
        if (headerBorderColor) {
          rootElement.style.setProperty("--tdg-cell-border-color", headerBorderColor)
        }
      }
    }

    const firstOddRow = rootElement.querySelector<HTMLElement>(".InovuaReactDataGrid__row--odd")
    if (!rootElement.style.getPropertyValue("--tdg-row-odd-bg").trim() && firstOddRow) {
      const oddBackground = window.getComputedStyle(firstOddRow).backgroundColor
      if (oddBackground && oddBackground !== "rgba(0, 0, 0, 0)") {
        rootElement.style.setProperty("--tdg-row-odd-bg", oddBackground)
      }
    }

    const firstEvenRow = rootElement.querySelector<HTMLElement>(".InovuaReactDataGrid__row--even")
    if (!rootElement.style.getPropertyValue("--tdg-row-even-bg").trim() && firstEvenRow) {
      const evenBackground = window.getComputedStyle(firstEvenRow).backgroundColor
      if (evenBackground && evenBackground !== "rgba(0, 0, 0, 0)") {
        rootElement.style.setProperty("--tdg-row-even-bg", evenBackground)
      }
    }
  }, [enabled, rootElement, themeClassSuffix])
}
