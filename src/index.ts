import { argv, exit } from "node:process";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import {
  createLogger,
  defaultTheme,
  loadVersions,
  loadSstDocsConfig,
  normalizeBaseUrlPath,
  resolveAgainstProjectRoot,
  resolveDataPath,
} from "@shadow-shard-tools/docs-core";
import type { ResolvedSstDocsConfig, StyleTheme } from "@shadow-shard-tools/docs-core/types";
import { FsDataProvider } from "@shadow-shard-tools/docs-core/data/fsDataProvider";
import { buildVersionRenderPlan } from "./render/buildPlan.js";
import { renderVersion } from "./render/renderVersion.js";

const DEFAULT_OUT_DIR = "dist/html";
const STATIC_STYLES_DIR = "static-styles";
const SEPARATE_BUILD_ENV_KEYS = [
  "SEPARATE_BUILD_FOR_HTML_GENERATOR",
  "separateBuildForHtmlGenerator",
] as const;

const logger = createLogger("html-generator");

type MaybeHtmlGeneratorSettings = {
  OUTPUT_DIRECTORY?: string;
  THEME?: StyleTheme;
  SEPARATE_BUILD_FOR_HTML_GENERATOR?: boolean;
} | undefined;

interface BuildConfigInput {
  versions: string[];
  quiet: boolean;
  dataRoot?: string;
  basePath?: string;
  outDir?: string;
  separateBuild?: boolean;
}

interface CliOptions extends BuildConfigInput {
  showHelp: boolean;
}

export interface HtmlGeneratorRuntime {
  docsConfig: ResolvedSstDocsConfig;
  theme: StyleTheme;
  outDir: string;
  staticAssetsDir: string;
  separateBuild: boolean;
  quiet: boolean;
  requestedVersions: string[];
}

const HELP_TEXT = `Static HTML generator for SST Docs.

Usage:
  sst-docs-html [options]

Options:
  --version <id>        Render only the specified version (repeatable)
  --data <dir>          Override docs JSON data directory
  --base <path>         Override public base path (/docs/, /help/, etc.)
  --out <dir>           Output directory when running in separate-build mode
  --inline              Disable separate-build mode and emit into data root
  --separate-build      Force separate-build mode
  --quiet               Reduce informational logging
  --help                Show this message
`;

const ensureOutDir = async (path: string) => {
  await mkdir(path, { recursive: true });
};

const parseCliArgs = (raw = argv.slice(2)): CliOptions => {
  const options: CliOptions = {
    versions: [],
    quiet: false,
    showHelp: false,
  };

  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--version" || arg === "-v") {
      const value = raw[++i];
      if (value) options.versions.push(value);
    } else if (arg.startsWith("--version=")) {
      options.versions.push(arg.split("=", 2)[1]);
    } else if (arg === "--data" || arg === "--data-root") {
      options.dataRoot = raw[++i] ?? options.dataRoot;
    } else if (arg.startsWith("--data=")) {
      options.dataRoot = arg.split("=", 2)[1];
    } else if (arg === "--base" || arg === "--base-path") {
      options.basePath = raw[++i] ?? options.basePath;
    } else if (arg.startsWith("--base=")) {
      options.basePath = arg.split("=", 2)[1];
    } else if (arg === "--out" || arg === "--out-dir") {
      options.outDir = raw[++i] ?? options.outDir;
    } else if (arg.startsWith("--out=")) {
      options.outDir = arg.split("=", 2)[1];
    } else if (arg === "--inline") {
      options.separateBuild = false;
    } else if (arg === "--separate-build") {
      options.separateBuild = true;
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--no-quiet") {
      options.quiet = false;
    } else if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    }
  }

  return options;
};

const normalizeBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
};

const readEnvSeparateOverride = (): boolean | undefined => {
  for (const key of SEPARATE_BUILD_ENV_KEYS) {
    const raw = process.env[key];
    if (raw === undefined) continue;
    const bool = normalizeBoolean(raw);
    if (bool !== undefined) return bool;
  }
  return undefined;
};

const resolveSeparateBuild = (
  overrides: BuildConfigInput,
  settings: MaybeHtmlGeneratorSettings,
) => {
  const envOverride = readEnvSeparateOverride();
  if (overrides.separateBuild !== undefined) return overrides.separateBuild;
  if (envOverride !== undefined) return envOverride;
  if (
    settings?.SEPARATE_BUILD_FOR_HTML_GENERATOR !== undefined &&
    settings.SEPARATE_BUILD_FOR_HTML_GENERATOR !== null
  ) {
    return settings.SEPARATE_BUILD_FOR_HTML_GENERATOR;
  }
  return false;
};

const createResolvedDocsConfig = (
  docsConfig: ResolvedSstDocsConfig,
  fsDataPath: string,
  publicDataPath: string,
) => ({
  ...docsConfig,
  FS_DATA_PATH: fsDataPath,
  PUBLIC_DATA_PATH: publicDataPath,
});

export async function buildConfig(
  overrides: BuildConfigInput,
): Promise<HtmlGeneratorRuntime> {
  const docsConfig = await loadSstDocsConfig();
  const htmlSettings = docsConfig.HTML_GENERATOR_SETTINGS;
  const fsDataPath = resolveDataPath(
    overrides.dataRoot ?? docsConfig.FS_DATA_PATH,
  );
  const publicDataPath = normalizeBaseUrlPath(
    overrides.basePath ?? docsConfig.PUBLIC_DATA_PATH,
  );
  const resolvedDocsConfig = createResolvedDocsConfig(
    docsConfig,
    fsDataPath,
    publicDataPath,
  );

  const separateBuild = resolveSeparateBuild(overrides, htmlSettings);
  const baseOutDir =
    overrides.outDir ?? htmlSettings?.OUTPUT_DIRECTORY ?? DEFAULT_OUT_DIR;
  const outDir = separateBuild
    ? resolveAgainstProjectRoot(baseOutDir)
    : fsDataPath;

  if (!separateBuild && overrides.outDir && overrides.outDir.trim() !== "") {
    logger.warn(
      "Ignoring --out option because separateBuildForHtmlGenerator is disabled.",
    );
  }

  const staticAssetsDir = separateBuild
    ? resolve(outDir, STATIC_STYLES_DIR)
    : resolve(fsDataPath, STATIC_STYLES_DIR);

  const theme = htmlSettings?.THEME ?? defaultTheme;

  return {
    docsConfig: {
      ...resolvedDocsConfig,
      HTML_GENERATOR_SETTINGS: {
        OUTPUT_DIRECTORY: baseOutDir,
        THEME: theme,
        SEPARATE_BUILD_FOR_HTML_GENERATOR: separateBuild,
      },
    },
    theme,
    outDir,
    staticAssetsDir,
    separateBuild,
    quiet: overrides.quiet,
    requestedVersions: overrides.versions,
  };
}

const printHelp = () => {
  // eslint-disable-next-line no-console
  console.log(HELP_TEXT.trimEnd());
};

export async function runCli() {
  const cliOptions = parseCliArgs();
  if (cliOptions.showHelp) {
    printHelp();
    return;
  }

  const { showHelp: _ignored, ...buildInputs } = cliOptions;
  const config = await buildConfig(buildInputs);
  const startTime = performance.now();

  if (!config.quiet) {
    logger.info("Starting static HTML generation");
    logger.info(`Data root: ${config.docsConfig.FS_DATA_PATH}`);
    logger.info(`Output dir: ${config.outDir}`);
    logger.info(`Base path: ${config.docsConfig.PUBLIC_DATA_PATH}`);
  }

  await ensureOutDir(config.outDir);

  const dataProvider = new FsDataProvider();
  let versions = await loadVersions(
    dataProvider,
    config.docsConfig.FS_DATA_PATH,
  );
  if (config.requestedVersions.length > 0) {
    const allowed = new Set(config.requestedVersions);
    versions = versions.filter((version) => allowed.has(version.version));
  }

  const plan = await buildVersionRenderPlan({
    config,
    versions,
    provider: dataProvider,
  });

  if (plan.entries.length === 0) {
    logger.error("Render plan produced no entries.");
    exit(1);
  }

  for (const entry of plan.entries) {
    if (!config.quiet) {
      logger.info(
        `Generating static output for ${entry.version.label ?? entry.version.version}`,
      );
    }
    await renderVersion(entry, config, logger);
  }

  const endTime = performance.now();

  if (!config.quiet) {
    logger.info(
      `Static HTML generation scaffolding completed in ${(
        (endTime - startTime) /
        1000
      ).toFixed(2)}s`,
    );
  }
}

const isCliExecution = () => {
  const entry = argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
};

if (isCliExecution()) {
  runCli().catch((err) => {
    logger.error("HTML generation failed.");
    logger.error(
      err instanceof Error ? (err.stack ?? err.message) : String(err),
    );
    exit(1);
  });
}
