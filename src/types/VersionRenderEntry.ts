import type {
  Category,
  DocItem,
  Product,
  Version,
} from "@shadow-shard-tools/docs-core";

export interface VersionRenderEntry {
  version: Version;
  versionRoot: string;
  product?: Product;
  items: DocItem[];
  tree: Category[];
  standaloneDocs: DocItem[];
}
