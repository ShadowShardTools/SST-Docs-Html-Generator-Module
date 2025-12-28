import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const loadVersionsMock = vi.fn();
const loadSstDocsConfigMock = vi.fn();
const resolveAgainstProjectRootMock = vi.fn();
const resolveDataPathMock = vi.fn();
const buildVersionRenderPlanMock = vi.fn();
const renderVersionMock = vi.fn();

let logger: ReturnType<typeof createLogger>;

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

vi.mock("@shadow-shard-tools/docs-core", () => {
  return {
    createLogger: () => logger,
    defaultTheme: {},
    loadVersions: loadVersionsMock,
    normalizeBaseUrlPath: (value?: string) => {
      if (!value) return "/";
      if (value === "/") return "/";
      const trimmed = value.replace(/\/+$/, "");
      return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    },
    resolveAgainstProjectRoot: (...args: Parameters<typeof resolveAgainstProjectRootMock>) =>
      resolveAgainstProjectRootMock(...args),
    resolveDataPath: (...args: Parameters<typeof resolveDataPathMock>) =>
      resolveDataPathMock(...args),
    loadSstDocsConfig: (...args: Parameters<typeof loadSstDocsConfigMock>) =>
      loadSstDocsConfigMock(...args),
  };
});

vi.mock("@shadow-shard-tools/docs-core/data/fsDataProvider", () => {
  return {
    FsDataProvider: class {},
  };
});

vi.mock("../src/render/buildPlan.js", () => ({
  buildVersionRenderPlan: (...args: Parameters<typeof buildVersionRenderPlanMock>) =>
    buildVersionRenderPlanMock(...args),
}));

vi.mock("../src/render/renderVersion.js", () => ({
  renderVersion: (...args: Parameters<typeof renderVersionMock>) =>
    renderVersionMock(...args),
}));

describe("cli runner", () => {
  let tempRoot: string;
  let originalArgv: string[];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    logger = createLogger();
    tempRoot = await mkdtemp(join(tmpdir(), "sst-cli-"));
    originalArgv = process.argv.slice();

    resolveAgainstProjectRootMock.mockImplementation((relative: string) =>
      resolve(tempRoot, relative),
    );
    resolveDataPathMock.mockImplementation((input?: string) =>
      resolve(tempRoot, input ?? "data"),
    );
    loadSstDocsConfigMock.mockResolvedValue({
      FS_DATA_PATH: "data",
      PUBLIC_DATA_PATH: "/docs/",
      HEADER_BRANDING: {},
      HTML_GENERATOR_SETTINGS: {
        OUTPUT_DIRECTORY: "dist-static",
        THEME: {},
        SEPARATE_BUILD_FOR_HTML_GENERATOR: true,
      },
    });
    loadVersionsMock.mockResolvedValue([{ version: "v1", label: "Version 1" }]);
    buildVersionRenderPlanMock.mockResolvedValue({
      entries: [
        {
          version: { version: "v1", label: "Version 1" },
          versionRoot: resolve(tempRoot, "data/v1"),
          items: [],
          tree: [],
          standaloneDocs: [],
        },
      ],
    });
    renderVersionMock.mockResolvedValue(undefined);
    await mkdir(resolve(tempRoot, "data/v1"), { recursive: true });
  });

  afterEach(async () => {
    process.argv = originalArgv;
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("parses CLI options and renders versions", async () => {
    process.argv = ["node", join(tempRoot, "bin", "cli.js"), "--version", "v1"];
    const { runCli } = await import("../src/index.ts");

    await runCli();

    expect(loadVersionsMock).toHaveBeenCalledWith(
      expect.any(Object),
      resolve(tempRoot, "data"),
    );
    expect(buildVersionRenderPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          outDir: resolve(tempRoot, "dist-static"),
          docsConfig: expect.objectContaining({
            FS_DATA_PATH: resolve(tempRoot, "data"),
          }),
        }),
      }),
    );
    expect(renderVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({ version: { version: "v1", label: "Version 1" } }),
      expect.objectContaining({
        outDir: resolve(tempRoot, "dist-static"),
        docsConfig: expect.objectContaining({
          FS_DATA_PATH: resolve(tempRoot, "data"),
        }),
      }),
      logger,
    );
    expect(logger.info).toHaveBeenCalledWith("Starting static HTML generation");
  });
});
