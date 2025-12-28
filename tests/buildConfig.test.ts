import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const normalizePath = (value: string) => value.replace(/\\/g, "/");

let loggerRef: {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
} | null = null;

const resolveAgainstProjectRootMock = vi.fn<(input: string) => string>();
const resolveDataPathMock = vi.fn<(input?: string) => string>();
const loadSstDocsConfigMock = vi.fn<
  () => Promise<{
    FS_DATA_PATH: string;
    PUBLIC_DATA_PATH: string;
    HEADER_BRANDING: Record<string, unknown>;
    HTML_GENERATOR_SETTINGS?: {
      OUTPUT_DIRECTORY: string;
      THEME: Record<string, unknown>;
      SEPARATE_BUILD_FOR_HTML_GENERATOR: boolean;
    };
    SEPARATE_BUILD_FOR_HTML_GENERATOR?: boolean;
  }>
>();

vi.mock("@shadow-shard-tools/docs-core", () => {
  return {
    createLogger: () => {
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };
      loggerRef = logger;
      return logger;
    },
    defaultTheme: {} as any,
    loadVersions: vi.fn(),
    normalizeBaseUrlPath: (value?: string) => {
      if (!value) return "/";
      if (value === "/") return "/";
      const trimmed = value.replace(/\/+$/, "");
      return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    },
    resolveAgainstProjectRoot: resolveAgainstProjectRootMock,
    resolveDataPath: resolveDataPathMock,
    loadSstDocsConfig: loadSstDocsConfigMock,
    loadSstDocsConfigFrom: loadSstDocsConfigMock,
  };
});

vi.mock("@shadow-shard-tools/docs-core/data/fsDataProvider", () => ({
  FsDataProvider: class {},
}));

const importModule = async () => {
  const mod = await import("../src/index.ts");
  return mod;
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveAgainstProjectRootMock.mockImplementation(
    (input) => `/root/${input ?? "."}`,
  );
  resolveDataPathMock.mockImplementation(
    (input) => `/resolved/${input ?? "default"}`,
  );
  loadSstDocsConfigMock.mockResolvedValue({
    FS_DATA_PATH: "public/SST-Docs/data",
    PUBLIC_DATA_PATH: "/docs/",
    HEADER_BRANDING: {},
    HTML_GENERATOR_SETTINGS: {
      OUTPUT_DIRECTORY: "dist-static",
      THEME: {},
      SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
    },
  });
  loggerRef = null;
});

afterEach(() => {
  delete process.env.SEPARATE_BUILD_FOR_HTML_GENERATOR;
  delete (process.env as any).separateBuildForHtmlGenerator;
  vi.resetModules();
});

describe("buildConfig", () => {
  it("uses values from sst-docs config when no overrides are provided", async () => {
    const { buildConfig } = await importModule();

    const config = await buildConfig({
      versions: [],
      quiet: false,
    });

    expect(resolveDataPathMock).toHaveBeenCalledWith("public/SST-Docs/data");
    expect(normalizePath(config.outDir)).toMatch(/\/root\/dist-static$/);
    expect(config.docsConfig.FS_DATA_PATH).toBe("/resolved/public/SST-Docs/data");
    expect(config.separateBuild).toBe(true);
    expect(config.docsConfig.PUBLIC_DATA_PATH).toBe("/docs");
    expect(config.docsConfig.HEADER_BRANDING).toEqual({});
    expect(config.theme).toEqual({});
    expect(normalizePath(config.staticAssetsDir)).toMatch(
      /\/root\/dist-static\/static-styles$/,
    );
  });

  it("prefers runtime overrides for data root and base path", async () => {
    const { buildConfig } = await importModule();

    const config = await buildConfig({
      versions: ["1.0.0"],
      quiet: true,
      dataRoot: "../custom/data",
      basePath: "docs/latest/",
    });

    expect(resolveDataPathMock).toHaveBeenCalledWith("../custom/data");
    expect(config.docsConfig.FS_DATA_PATH).toBe("/resolved/../custom/data");
    expect(config.docsConfig.PUBLIC_DATA_PATH).toBe("/docs/latest");
  });

  it("honours CLI separate build overrides and ignores --out when inline mode", async () => {
    loadSstDocsConfigMock.mockResolvedValueOnce({
      FS_DATA_PATH: "public/SST-Docs/data",
      PUBLIC_DATA_PATH: "/docs/",
      HEADER_BRANDING: {},
      HTML_GENERATOR_SETTINGS: {
        OUTPUT_DIRECTORY: "dist-static",
        THEME: {},
        SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
      },
    });

    const { buildConfig } = await importModule();

    const config = await buildConfig({
      versions: [],
      quiet: false,
      separateBuild: false,
      outDir: "custom-out",
    });

    expect(config.separateBuild).toBe(false);
    expect(normalizePath(config.outDir)).toMatch(
      /\/resolved\/public\/SST-Docs\/data$/,
    );
    expect(normalizePath(config.staticAssetsDir)).toMatch(
      /\/resolved\/public\/SST-Docs\/data\/static-styles$/,
    );
    expect(loggerRef?.warn).toHaveBeenCalledWith(
      "Ignoring --out option because separateBuildForHtmlGenerator is disabled.",
    );
  });

  it("falls back to environment variables when present", async () => {
    process.env.SEPARATE_BUILD_FOR_HTML_GENERATOR = "false";
    loadSstDocsConfigMock.mockResolvedValueOnce({
      FS_DATA_PATH: "public/SST-Docs/data",
      PUBLIC_DATA_PATH: "/docs/",
      HEADER_BRANDING: {},
      HTML_GENERATOR_SETTINGS: {
        OUTPUT_DIRECTORY: "dist-static",
        THEME: {},
        SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
      },
    });

    const { buildConfig } = await importModule();

    const config = await buildConfig({
      versions: [],
      quiet: false,
    });

    expect(config.separateBuild).toBe(false);
    expect(config.outDir).toBe("/resolved/public/SST-Docs/data");
  });
});
