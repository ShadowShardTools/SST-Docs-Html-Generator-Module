import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HtmlGeneratorRuntime } from "../src/index.js";
import type { VersionRenderEntry } from "../src/types/index.js";

const chartMocks = {
  prepareContent: vi.fn(),
  getAssetHref: vi.fn(() => ({ src: "./chart.png", width: 320, height: 200 })),
  listAssets: vi.fn(() => ["charts/chart.png"]),
};

let chartConstructorArgs: { theme: unknown; outDir: string; logger: unknown } | null =
  null;

vi.mock("../src/render/chartAssets.ts", () => ({
  ChartAssetManager: class {
    constructor(theme: unknown, outDir: string, logger: unknown) {
      chartConstructorArgs = { theme, outDir, logger };
    }

    prepareContent = chartMocks.prepareContent;
    getAssetHref = chartMocks.getAssetHref;
    listAssets = chartMocks.listAssets;
  },
}));

const copyVersionAssetsMock = vi.fn(
  async () => ({ mediaPaths: ["media/image.png"] }),
);

vi.mock("../src/render/copyAssets.ts", () => ({
  copyVersionAssets: copyVersionAssetsMock,
}));

const createConfig = (
  overrides: Partial<HtmlGeneratorRuntime> = {},
): HtmlGeneratorRuntime => ({
  docsConfig: {
    FS_DATA_PATH: "/data",
    PUBLIC_DATA_PATH: "/docs/",
    HEADER_BRANDING: {},
    HTML_GENERATOR_SETTINGS: {
      OUTPUT_DIRECTORY: "dist-static",
      THEME: {
        navigation: {},
        category: {},
        sections: {},
        text: {},
      } as any,
      SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
    },
  },
  theme: {
    navigation: {},
    category: {},
    sections: {},
    text: {},
  } as any,
  outDir: "/out",
  staticAssetsDir: "/assets",
  separateBuild: true,
  quiet: true,
  requestedVersions: [],
  ...overrides,
});

const createEntry = (): VersionRenderEntry => {
  const sharedDoc = {
    id: "getting-started",
    title: "Getting Started",
    description: "Intro guide",
    content: [],
  };

  return {
    version: { version: "1.0.0", label: "Release 1" } as any,
    versionRoot: "/data/1.0.0",
    items: [sharedDoc] as any,
    tree: [
      {
        id: "guides",
        title: "Guides",
        description: "Guided learning",
        content: [],
        docs: [sharedDoc],
        children: [],
      },
    ] as any,
    standaloneDocs: [
      {
        id: "standalone",
        title: "Standalone Doc",
        description: "",
        content: [],
      },
    ] as any,
  };
};

describe("renderVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chartConstructorArgs = null;
  });

  it("renders HTML output and writes a static manifest", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "sst-html-"));
    const outDir = join(tempRoot, "out");
    const staticAssetsDir = join(tempRoot, "assets");
    const config = createConfig({
      cwd: tempRoot,
      outDir,
      staticAssetsDir,
    });

    const entry = createEntry();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const { renderVersion } = await import("../src/render/renderVersion.ts");

    try {
      await renderVersion(entry, config, logger as any);

      const versionDir = join(outDir, entry.version.version);
      const indexHtml = await readFile(join(versionDir, "index.html"), "utf8");
      const manifestRaw = await readFile(
        join(versionDir, "static-manifest.json"),
        "utf8",
      );
      const manifest = JSON.parse(manifestRaw);

      expect(indexHtml).toContain("Getting Started");
      expect(manifest.version).toBe("1.0.0");
      expect(manifest.categories).toContain("categories/guides/index.html");
      expect(manifest.docs).toContain("docs/getting-started/index.html");
      expect(manifest.media).toEqual(["media/image.png"]);
      expect(manifest.charts).toEqual(["charts/chart.png"]);
      expect(manifest.staticStylesPath).toContain("assets");

      expect(copyVersionAssetsMock).toHaveBeenCalledWith(
        entry,
        config,
        logger,
        staticAssetsDir,
      );
      expect(chartMocks.prepareContent).toHaveBeenCalledTimes(4);
      expect(chartMocks.listAssets).toHaveBeenCalledTimes(1);
      expect(chartConstructorArgs?.outDir).toBe(versionDir);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
