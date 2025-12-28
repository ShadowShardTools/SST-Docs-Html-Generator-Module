import { describe, expect, it } from "vitest";
import type { ResolvedSstDocsConfig } from "@shadow-shard-tools/docs-core/types";
import { buildNavigationIndex } from "../src/render/structure/navigation.ts";
import type { VersionRenderEntry } from "../src/types/index.js";

const createConfig = (
  overrides: Partial<ResolvedSstDocsConfig> = {},
): ResolvedSstDocsConfig => ({
  FS_DATA_PATH: "/data",
  PUBLIC_DATA_PATH: "/docs/",
  HEADER_BRANDING: {},
  HTML_GENERATOR_SETTINGS: {
    OUTPUT_DIRECTORY: "dist-static",
    THEME: {} as any,
    SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
  },
  ...overrides,
});

describe("buildNavigationIndex", () => {
  it("constructs navigation structures with categories, documents, and standalone docs", () => {
    const entry: VersionRenderEntry = {
      version: { version: "1.0.0", label: "Release 1" } as any,
      versionRoot: "/data/1.0.0",
      items: [],
      tree: [
        {
          id: "guides",
          title: "Guides",
          description: "Guided learning",
          content: [],
          docs: [
            {
              id: "getting-started",
              title: "Getting Started",
              description: "Intro guide",
              content: [],
            },
          ],
          children: [
            {
              id: "advanced",
              title: "Advanced",
              description: "Deep dive",
              docs: [
                {
                  id: "performance",
                  title: "Performance",
                  description: "Tuning tips",
                  content: [],
                },
              ],
              children: [],
              content: [],
            },
          ],
        },
      ] as any,
      standaloneDocs: [
        {
          id: "release-notes",
          title: "Release Notes",
          description: "What changed",
          content: [],
        },
      ] as any,
    };

    const config = createConfig();

    const navIndex = buildNavigationIndex(entry, config);

    expect(navIndex.versionBaseUrl).toBe("/docs/1.0.0/");
    expect(navIndex.versionLabel).toBe("Release 1");
    expect(navIndex.categories.size).toBe(2);
    expect(navIndex.documents.size).toBe(3);
    expect(navIndex.tree).toHaveLength(1);
    expect(navIndex.standaloneDocuments).toHaveLength(1);

    const childCategory = navIndex.categories.get("advanced");
    expect(childCategory).toBeDefined();
    expect(childCategory?.breadcrumb).toEqual(["Guides", "Advanced"]);
    expect(childCategory?.ancestorCategoryIds).toEqual(["guides"]);

    const doc = navIndex.documents.get("getting-started");
    expect(doc).toBeDefined();
    expect(doc?.breadcrumb).toEqual(["Guides", "Getting Started"]);
    expect(doc?.isStandalone).toBe(false);

    const standalone = navIndex.standaloneDocuments[0];
    expect(standalone.id).toBe("release-notes");
    expect(standalone.isStandalone).toBe(true);
  });
});
