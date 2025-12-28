import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  stat,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { HtmlGeneratorRuntime } from "../src/index.js";
import { copyVersionAssets } from "../src/render/copyAssets.ts";
import type { VersionRenderEntry } from "../src/types/index.js";

const createLogger = () => ({
  debug: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
});

describe("copyVersionAssets", () => {
  it("copies required assets, fonts, and media when resources exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "sst-copy-assets-success-"));
    try {
      const distAssets = join(root, "dist/assets");
      await mkdir(distAssets, { recursive: true });
      await writeFile(
        join(distAssets, "index-123.css"),
        `body{background:url("/SST-Docs/assets/fonts/font.woff2");}`,
        "utf8",
      );
      await writeFile(join(distAssets, "KaTeX_Main.woff2"), "font", "utf8");

      const prismDir = join(root, "node_modules/prismjs/themes");
      await mkdir(prismDir, { recursive: true });
      await writeFile(join(prismDir, "prism-tomorrow.css"), "code", "utf8");

      const dataRoot = join(root, "data");
      const mediaFile = join(dataRoot, "v1/media/diagram.png");
      await mkdir(join(dataRoot, "v1/media"), { recursive: true });
      await writeFile(mediaFile, "image-binary");

      const config: HtmlGeneratorRuntime = {
        docsConfig: {
          FS_DATA_PATH: dataRoot,
          PUBLIC_DATA_PATH: "/docs/",
          HEADER_BRANDING: {},
          HTML_GENERATOR_SETTINGS: {
            OUTPUT_DIRECTORY: "dist-static",
            THEME: {} as any,
            SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
          },
        },
        theme: {} as any,
        outDir: join(root, "out"),
        staticAssetsDir: join(root, "out/static-styles"),
        separateBuild: true,
        quiet: true,
        requestedVersions: [],
      };

      const entry: VersionRenderEntry = {
        version: { version: "v1", label: "Version 1" } as any,
        versionRoot: "",
        items: [
          {
            content: [
              "/docs/v1/media/diagram.png",
              {
                nested: [
                  "/docs/v1/media/diagram.png",
                  "https://example.com/external.png",
                ],
              },
            ],
          },
        ] as any,
        tree: [
          {
            content: {
              hero: "/docs/v1/media/diagram.png",
            },
          },
        ] as any,
        standaloneDocs: [
          { content: ["/docs/v1/media/diagram.png"] },
        ] as any,
      };

      const logger = createLogger();
      const assetsDir = join(config.outDir, "static-styles");

      const result = await copyVersionAssets(entry, config, logger, assetsDir, {
        projectRoot: root,
      });

      expect(result.mediaPaths).toEqual(["media/diagram.png"]);
      expect(logger.warn).not.toHaveBeenCalled();

      const siteCss = await readFile(join(assetsDir, "site.css"), "utf8");
      expect(siteCss).toContain('url("./fonts/font.woff2")');

      const prismTheme = await readFile(
        join(assetsDir, "prism-tomorrow.css"),
        "utf8",
      );
      expect(prismTheme).toBe("code");

      const staticStyles = await readFile(
        join(assetsDir, "static-code-block.css"),
        "utf8",
      );
      expect(staticStyles).toContain(".static-code-block");

      const carouselStyles = await readFile(
        join(assetsDir, "static-carousel.css"),
        "utf8",
      );
      expect(carouselStyles).toContain(".static-carousel");

      const compareStyles = await readFile(
        join(assetsDir, "static-compare.css"),
        "utf8",
      );
      expect(compareStyles).toContain(".static-compare");

      const katexFont = await readFile(
        join(assetsDir, "KaTeX_Main.woff2"),
        "utf8",
      );
      expect(katexFont).toBe("font");

      const manifestRaw = await readFile(
        join(assetsDir, "assets-manifest.json"),
        "utf8",
      );
      const manifest = JSON.parse(manifestRaw);
      expect(Array.isArray(manifest)).toBe(true);
      expect(manifest).toContain("site.css");
      expect(manifest).toContain("KaTeX_Main.woff2");

      const copiedMedia = join(config.outDir, "v1/media/diagram.png");
      await expect(stat(copiedMedia)).resolves.toBeDefined();

      const assets = await readdir(assetsDir);
      expect(assets).toEqual(expect.arrayContaining(["site.css", "prism-tomorrow.css"]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("logs warnings when assets are missing and media copy fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "sst-copy-assets-failure-"));
    try {
      const config: HtmlGeneratorRuntime = {
        docsConfig: {
          FS_DATA_PATH: join(root, "data"),
          PUBLIC_DATA_PATH: "/docs/",
          HEADER_BRANDING: {},
          HTML_GENERATOR_SETTINGS: {
            OUTPUT_DIRECTORY: "dist-static",
            THEME: {} as any,
            SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
          },
        },
        theme: {} as any,
        outDir: join(root, "out"),
        staticAssetsDir: join(root, "out/static-styles"),
        separateBuild: true,
        quiet: false,
        requestedVersions: [],
      };

      const entry: VersionRenderEntry = {
        version: { version: "v2" } as any,
        versionRoot: "",
        items: [
          {
            content: "/docs/v2/media/missing.png",
          },
        ] as any,
        tree: [],
        standaloneDocs: [],
      };

      const logger = createLogger();
      const assetsDir = join(config.outDir, "static-styles");

      const result = await copyVersionAssets(entry, config, logger, assetsDir, {
        projectRoot: root,
      });

      expect(result.mediaPaths).toEqual(["media/missing.png"]);
      const warnings = logger.warn.mock.calls.map((call) => String(call[0])).join(" ");
      expect(warnings).toMatch(/No CSS assets found/);
      expect(warnings).toMatch(/Prism theme/);
      expect(warnings).toMatch(/KaTeX font assets/);
      expect(warnings).toMatch(/Missing media asset/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
