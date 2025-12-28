import { resolve } from "node:path";
import { createLogger, loadVersionData, type DataProvider, type Version } from "@shadow-shard-tools/docs-core";
import type { RenderPlan } from "../types/index.js";
import type { HtmlGeneratorRuntime } from "../index.js";

export async function buildVersionRenderPlan(params: {
  config: HtmlGeneratorRuntime;
  versions: Version[];
  provider: DataProvider;
}): Promise<RenderPlan> {
  const { config, versions, provider } = params;
  const plan: RenderPlan = { entries: [] };
  const logger = createLogger("html-generator:plan");

  for (const version of versions) {
    const root = resolve(config.docsConfig.FS_DATA_PATH, version.version);
    const { items, tree, standaloneDocs } = await loadVersionData(
      provider,
      root,
    );
    logger.debug(
      `Prepared version ${version.version}: ${tree.length} categories, ${items.length} docs, ${standaloneDocs.length} standalone`,
    );
    plan.entries.push({
      version,
      versionRoot: root,
      items,
      tree,
      standaloneDocs,
    });
  }

  return plan;
}
