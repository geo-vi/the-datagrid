import { posix, win32 } from "node:path";
import { expect, test } from "@playwright/test";

import { toViteFsUrl } from "./helpers/vite-fs-url";

/**
 * Pins the `/@fs/` URL construction used by the packed-consumer specs. These
 * run on every platform, so the Windows shape is asserted from a `path.win32`
 * result rather than from whatever the host happens to produce.
 */
test.describe("vite /@fs URL normalization", () => {
  test("turns a Windows absolute path into a single-slash /@fs URL", () => {
    const absolute = win32.resolve("C:\\Users\\dev\\the-datagrid", "dist/index.js");

    expect(absolute).toBe("C:\\Users\\dev\\the-datagrid\\dist\\index.js");
    expect(toViteFsUrl(absolute)).toBe(
      "/@fs/C:/Users/dev/the-datagrid/dist/index.js"
    );
  });

  test("keeps a POSIX absolute path on exactly one slash", () => {
    const absolute = posix.resolve("/home/dev/the-datagrid", "dist/index.js");

    expect(absolute).toBe("/home/dev/the-datagrid/dist/index.js");
    expect(toViteFsUrl(absolute)).toBe("/@fs/home/dev/the-datagrid/dist/index.js");
  });

  test("never emits the /@fsC: shape that Vite answers with a 404", () => {
    for (const absolute of [
      "C:\\Users\\dev\\dist\\index.js",
      "D:\\a\\the-datagrid\\the-datagrid\\dist\\search.js",
      "/home/runner/work/the-datagrid/dist/search.js",
    ]) {
      const url = toViteFsUrl(absolute);

      expect(url.startsWith("/@fs/")).toBe(true);
      expect(url).not.toContain("\\");
      expect(url).not.toMatch(/^\/@fs\/\//);
    }
  });
});
