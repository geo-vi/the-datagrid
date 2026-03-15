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
    cssVar: "--tdg-row-odd-hover-bg",
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
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "rgb(0 0 0 / 0)" ||
    normalized === "rgb(0, 0, 0, 0)"
  )
}

export function useLegacyThemeBridge(
  rootElement: HTMLElement | null,
  themeClassSuffix: string
) {
  React.useLayoutEffect(() => {
    if (!rootElement || typeof document === "undefined") return

    for (const matcher of LEGACY_THEME_MATCHERS) {
      rootElement.style.removeProperty(matcher.cssVar)
    }

    rootElement.style.removeProperty("--tdg-header-bg")
    rootElement.style.removeProperty("--tdg-header-border-color")
    rootElement.style.removeProperty("--tdg-filter-border-color")
    rootElement.style.removeProperty("--tdg-cell-border-color")
    rootElement.style.removeProperty("--tdg-grid-border-color")

    const themeSelector = `.InovuaReactDataGrid--theme-${themeClassSuffix}`
    const found = new Set<string>()

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined

      try {
        rules = sheet.cssRules
      } catch {
        continue
      }

      visitRules(rules, (rule) => {
        if (!rule.selectorText.includes(themeSelector)) return

        for (const matcher of LEGACY_THEME_MATCHERS) {
          if (found.has(matcher.cssVar) || !matcher.matches(rule.selectorText, themeSelector)) continue

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

    const inputBorderColor = rootElement.style.getPropertyValue("--tdg-input-border-color").trim()
    const inputBorderColorHover = rootElement.style.getPropertyValue("--tdg-input-border-color-hover").trim()
    const inputBorderColorFocus = rootElement.style.getPropertyValue("--tdg-input-border-color-focus").trim()
    const selectBorderColor = rootElement.style.getPropertyValue("--tdg-select-border-color").trim()
    const selectBorderColorHover = rootElement.style.getPropertyValue("--tdg-select-border-color-hover").trim()
    const selectBorderColorFocus = rootElement.style.getPropertyValue("--tdg-select-border-color-focus").trim()

    const normalizedSelectBorderColor = isMissingColorValue(selectBorderColor)
      ? inputBorderColor || border
      : selectBorderColor
    const normalizedSelectBorderColorHover = isMissingColorValue(selectBorderColorHover)
      ? inputBorderColorHover || normalizedSelectBorderColor
      : selectBorderColorHover
    const normalizedSelectBorderColorFocus = isMissingColorValue(selectBorderColorFocus)
      ? inputBorderColorFocus || normalizedSelectBorderColor
      : selectBorderColorFocus

    if (normalizedSelectBorderColor) {
      rootElement.style.setProperty("--tdg-select-shell-border-color", normalizedSelectBorderColor)
    }
    if (normalizedSelectBorderColorHover) {
      rootElement.style.setProperty("--tdg-select-shell-border-color-hover", normalizedSelectBorderColorHover)
    }
    if (normalizedSelectBorderColorFocus) {
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
      ? normalizedSelectBorderColor || border
      : dropdownBorderColor

    if (normalizedDropdownBorderColor) {
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
  }, [rootElement, themeClassSuffix])
}
