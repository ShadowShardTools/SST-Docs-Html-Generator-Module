import type { Category, DocItem, Version } from "@shadow-shard-tools/docs-core";

export interface VersionRenderEntry {
  version: Version;
  versionRoot: string;
  items: DocItem[];
  tree: Category[];
  standaloneDocs: DocItem[];
}