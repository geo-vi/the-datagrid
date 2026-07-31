import { resolve } from "node:path";

/**
 * Vite serves absolute filesystem paths under `/@fs/`.
 *
 * A POSIX path already starts with a slash (`/home/…`), but a Windows path
 * resolves to `C:\…` with backslashes and no leading slash, so concatenating it
 * onto `/@fs` produces `/@fsC:/…`, which Vite answers with a 404. Normalise the
 * separators and guarantee exactly one slash after the prefix so both shapes
 * end up as `/@fs/<absolute path>`.
 */
export function toViteFsUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, "/");
  return `/@fs/${normalized.replace(/^\/+/, "")}`;
}

/** Resolve a repo-relative path against the cwd and express it as a `/@fs/` URL. */
export function viteFsUrl(filePath: string): string {
  return toViteFsUrl(resolve(process.cwd(), filePath));
}
