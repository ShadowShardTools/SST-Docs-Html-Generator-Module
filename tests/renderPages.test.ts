import { describe, expect, it } from "vitest";
import type { ResolvedSstDocsConfig, StyleTheme } from "@shadow-shard-tools/docs-core/types";
import { renderDocumentPage } from "../src/render/structure/renderDocument.ts";
import { renderCategoryPage } from "../src/render/structure/renderCategory.ts";
import { buildNavigationIndex } from "../src/render/structure/navigation.ts";
import type { VersionRenderEntry } from "../src/types/index.js";

const createDocsConfig = (
  overrides: Partial<ResolvedSstDocsConfig> = {},
): ResolvedSstDocsConfig => ({
  FS_DATA_PATH: "/data",
  PUBLIC_DATA_PATH: "/docs/",
  HEADER_BRANDING: { logoText: "Docs" },
  HTML_GENERATOR_SETTINGS: {
    OUTPUT_DIRECTORY: "dist-static",
    THEME: {} as StyleTheme,
    SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
  },
  ...overrides,
});

const createTheme = (overrides: Partial<StyleTheme> = {}): StyleTheme => ({
  navigation: {},
  category: {},
  sections: {},
  text: {},
  ...overrides,
});

const createEntry = (): VersionRenderEntry => ({
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
      children: [],
    },
  ] as any,
  standaloneDocs: [],
});

describe("render pages", () => {
  it("renders a document page with breadcrumb and description", () => {
    const docsConfig = createDocsConfig();
    const theme = createTheme();
    const navIndex = buildNavigationIndex(createEntry(), docsConfig);
    const doc = navIndex.documents.get("getting-started");
    expect(doc).toBeDefined();

    const html = renderDocumentPage(
      doc!,
      navIndex,
      theme,
      docsConfig.HEADER_BRANDING,
      "styles/site.css",
      ["styles/prism.css"],
      (relative) => `/docs/${relative}`,
      (assetPath) => assetPath.replace("/SST-Docs/data/", "/assets/data/"),
      () => null,
    );

    expect(html).toContain("Getting Started");
    expect(html).toContain("Intro guide");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("Guides");
    expect(html).toContain('aria-label="Getting Started"');
    expect(html).toContain("styles/site.css");
    expect(html).toContain("styles/prism.css");
  });

  it("renders a category page with child cards and breadcrumb", () => {
    const docsConfig = createDocsConfig();
    const theme = createTheme();
    const entry = createEntry();
    const navIndex = buildNavigationIndex(entry, docsConfig);
    const category = navIndex.categories.get("guides");
    expect(category).toBeDefined();

    const html = renderCategoryPage(
      category!,
      navIndex,
      theme,
      docsConfig.HEADER_BRANDING,
      "styles/site.css",
      [],
      (relative) => `/docs/${relative}`,
      (assetPath) => assetPath,
      () => null,
    );

    expect(html).toContain("Guides");
    expect(html).toContain("Getting Started");
    expect(html).not.toContain("This category is empty.");
  });
});
