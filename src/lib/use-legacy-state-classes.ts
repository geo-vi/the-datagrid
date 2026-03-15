import * as React from "react"

type LegacyStateClassMapping = {
  attribute: string
  className: string
  value?: string
}

export function useLegacyStateClasses<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  mappings: LegacyStateClassMapping[]
) {
  const mappingsKey = mappings
    .map(({ attribute, className, value }) => `${attribute}:${value ?? "__present__"}:${className}`)
    .join("|")

  React.useEffect(() => {
    const node = ref.current
    if (!node) return

    const sync = () => {
      for (const mapping of mappings) {
        const attributeValue = node.getAttribute(mapping.attribute)
        const isMatch =
          mapping.value === undefined
            ? attributeValue !== null
            : attributeValue === mapping.value

        node.classList.toggle(mapping.className, isMatch)
      }
    }

    sync()

    const observer = new MutationObserver(sync)
    observer.observe(node, {
      attributes: true,
      attributeFilter: [...new Set(mappings.map((mapping) => mapping.attribute))],
    })

    return () => observer.disconnect()
  }, [ref, mappings, mappingsKey])
}
