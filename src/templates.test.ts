import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { join } from "node:path";

const CWD = "/repo/project";
const TEMPLATES_ROOT = join(CWD, "project-templates");

const existsSyncMock = mock();
const statSyncMock = mock();

mock.module("node:fs", () => ({
  existsSync: existsSyncMock,
  statSync: statSyncMock,
}));

spyOn(process, "cwd").mockReturnValue(CWD);

const { resolveTemplateChain } = await import("./templates.ts");

describe("resolveTemplateChain", () => {
  beforeEach(() => {
    existsSyncMock.mockImplementation((_path: string) => false);
    statSyncMock.mockImplementation((_path: string) => ({
      isDirectory: () => _path === TEMPLATES_ROOT,
    }));
  });

  test("resolves a single-part template name", () => {
    const templateDir = join(TEMPLATES_ROOT, "js");
    existsSyncMock.mockImplementation(
      (path: string) => path === TEMPLATES_ROOT || path === templateDir,
    );

    expect(resolveTemplateChain("js")).toEqual([templateDir]);
  });

  test("resolves a dot-delimited chain in order", () => {
    const jsDir = join(TEMPLATES_ROOT, "js");
    const jsBunDir = join(TEMPLATES_ROOT, "js.bun");
    const jsBunLibDir = join(TEMPLATES_ROOT, "js.bun.lib");
    existsSyncMock.mockImplementation(
      (path: string) =>
        path === TEMPLATES_ROOT ||
        path === jsDir ||
        path === jsBunDir ||
        path === jsBunLibDir,
    );

    expect(resolveTemplateChain("js.bun.lib")).toEqual([
      jsDir,
      jsBunDir,
      jsBunLibDir,
    ]);
  });

  test("throws when a parent template in the chain is missing", () => {
    const jsBunDir = join(TEMPLATES_ROOT, "js.bun");
    existsSyncMock.mockImplementation(
      (path: string) => path === TEMPLATES_ROOT || path === jsBunDir,
    );

    expect(() => resolveTemplateChain("js.bun")).toThrow(
      /Template "js" not found/,
    );
  });

  test("throws when first template in the chain is missing", () => {
    const jsDir = join(TEMPLATES_ROOT, "js");
    existsSyncMock.mockImplementation(
      (path: string) => path === TEMPLATES_ROOT || path === jsDir,
    );

    expect(() => resolveTemplateChain("js.bun")).toThrow(
      /Template "js\.bun" not found/,
    );
  });

  test("throws when the templates root cannot be found", () => {
    existsSyncMock.mockImplementation(() => false);

    expect(() => resolveTemplateChain("js")).toThrow(
      /Could not find a "project-templates" directory/,
    );
  });
});
