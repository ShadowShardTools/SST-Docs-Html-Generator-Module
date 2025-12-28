import { resolve } from "node:path";
import {
  createLogger,
  loadProducts,
  loadVersions,
  loadVersionDataFromFs,
  type DataProvider,
  type Product,
  type Version,
} from "@shadow-shard-tools/docs-core";
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
  const root = config.docsConfig.FS_DATA_PATH;
  const productVersioning = config.docsConfig.PRODUCT_VERSIONING ?? false;

  const addVersionEntry = async ({
    product,
    version,
  }: {
    product?: Product;
    version: Version;
  }) => {
    const data = await loadVersionDataFromFs(root, {
      productVersioning,
      product: product?.product,
      version: version.version,
    });

    logger.debug(
      `Prepared ${product ? `product ${product.product} / ` : ""}version ${version.version}: ${data.tree.length} categories, ${data.items.length} docs, ${data.standaloneDocs.length} standalone`,
    );

    plan.entries.push({
      product,
      version,
      versionRoot: resolve(
        root,
        product ? product.product : "",
        version.version,
      ),
      items: data.items,
      tree: data.tree,
      standaloneDocs: data.standaloneDocs,
    });
  };

  if (!productVersioning) {
    for (const version of versions) {
      await addVersionEntry({ version });
    }
    return plan;
  }

  const products = await loadProducts(provider, root);
  if (products.length === 0) {
    logger.warn(
      "PRODUCT_VERSIONING is enabled but no products were found; falling back to single-root rendering.",
    );
    for (const version of versions) {
      await addVersionEntry({ version });
    }
    return plan;
  }

  for (const product of products) {
    const productRoot = resolve(root, product.product);
    let productVersions = await loadVersions(provider, productRoot);

    if (config.requestedVersions.length > 0) {
      const allowed = new Set(config.requestedVersions);
      productVersions = productVersions.filter((v) => allowed.has(v.version));
    }

    for (const version of productVersions) {
      await addVersionEntry({ product, version });
    }
  }

  return plan;
}
