import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HtmlGeneratorRuntime } from "../src/index.js";

const loadVersionDataMock = vi.fn();

const normalizePath = (value: string) => value.replace(/\\/g, "/");

vi.mock("@shadow-shard-tools/docs-core", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  loadVersionData: loadVersionDataMock,
}));

describe("buildVersionRenderPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads version data for each version and builds the render plan", async () => {
    const { buildVersionRenderPlan } = await import(
      "../src/render/buildPlan.ts"
    );

    const config: HtmlGeneratorRuntime = {
      docsConfig: {
        FS_DATA_PATH: "/data",
        PUBLIC_DATA_PATH: "/docs/",
        HEADER_BRANDING: {},
        HTML_GENERATOR_SETTINGS: {
          OUTPUT_DIRECTORY: "dist-static",
          THEME: {} as any,
          SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
        },
      },
      theme: {} as any,
      outDir: "/project/dist",
      staticAssetsDir: "/project/dist/static-styles",
      separateBuild: true,
      quiet: true,
      requestedVersions: [],
    };

    loadVersionDataMock
      .mockResolvedValueOnce({
        items: [{ id: "doc-1" }],
        tree: [{ id: "category-1" }],
        standaloneDocs: [],
      })
      .mockResolvedValueOnce({
        items: [{ id: "doc-2" }],
        tree: [{ id: "category-2" }],
        standaloneDocs: [{ id: "standalone" }],
      });

    const versions = [
      { version: "1.0.0", label: "v1" },
      { version: "2.0.0" },
    ];

    const provider = { kind: "test-provider" } as any;

    const plan = await buildVersionRenderPlan({
      config,
      versions,
      provider,
    });

    expect(loadVersionDataMock).toHaveBeenCalledTimes(2);
    expect(loadVersionDataMock).toHaveBeenNthCalledWith(1, provider, expect.any(String));
    expect(loadVersionDataMock).toHaveBeenNthCalledWith(2, provider, expect.any(String));
    expect(
      normalizePath(loadVersionDataMock.mock.calls[0][1] as string),
    ).toMatch(/\/data\/1\.0\.0$/);
    expect(
      normalizePath(loadVersionDataMock.mock.calls[1][1] as string),
    ).toMatch(/\/data\/2\.0\.0$/);

    expect(plan.entries).toHaveLength(2);
    expect(plan.entries[0].version).toBe(versions[0]);
    expect(normalizePath(plan.entries[0].versionRoot)).toMatch(
      /\/data\/1\.0\.0$/,
    );
    expect(plan.entries[0].tree).toEqual([{ id: "category-1" }]);
    expect(plan.entries[1].version).toBe(versions[1]);
    expect(normalizePath(plan.entries[1].versionRoot)).toMatch(
      /\/data\/2\.0\.0$/,
    );
    expect(plan.entries[1].standaloneDocs).toEqual([{ id: "standalone" }]);
  });
});
