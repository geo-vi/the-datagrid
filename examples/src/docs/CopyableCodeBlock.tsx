import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Copy } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";

type CopyableCodeBlockProps = {
  code: string;
  language?: string;
  label?: string;
  className?: string;
};

const prismTheme = themes.github;

function normalizeLanguage(language: string): Language {
  const normalized = language.toLowerCase();

  if (normalized === "bash" || normalized === "sh" || normalized === "shell") {
    return "javascript";
  }

  return normalized;
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function CopyableCodeBlock(props: CopyableCodeBlockProps) {
  const { className, code, label, language = "tsx" } = props;
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const headerLabel = label ?? language;
  const prismLanguage = normalizeLanguage(language);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    await copyText(code);
    setCopied(true);

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 1500);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    await handleCopy();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Copy ${headerLabel} code block`}
      data-testid={`copy-code-block-${headerLabel.toLowerCase()}`}
      onClick={() => {
        void handleCopy();
      }}
      onKeyDown={(event) => {
        void handleKeyDown(event);
      }}
      className={[
        "group cursor-copy overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {headerLabel}
        </span>
        <button
          type="button"
          aria-label={`Copy ${headerLabel} code button`}
          data-testid={`copy-code-button-${headerLabel.toLowerCase()}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={(event) => {
            event.stopPropagation();
            void handleCopy();
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <Highlight code={code} language={prismLanguage} theme={prismTheme}>
        {({
          className: prismClassName,
          style,
          tokens,
          getLineProps,
          getTokenProps,
        }) => (
          <pre
            className="overflow-x-auto px-4 py-4 text-xs leading-6"
            style={{ ...style, margin: 0 }}
          >
            <code className={prismClassName}>
              {tokens.map((line, lineIndex) => {
                const lineProps = getLineProps({ line });

                return (
                  <div key={`${headerLabel}-line-${lineIndex}`} {...lineProps}>
                    {line.map((token, tokenIndex) => {
                      const tokenProps = getTokenProps({ token });

                      return (
                        <span
                          key={`${headerLabel}-token-${lineIndex}-${tokenIndex}`}
                          {...tokenProps}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
