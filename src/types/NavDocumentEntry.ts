import type { DocItem } from "@shadow-shard-tools/docs-core";

export interface NavDocumentEntry {
  id: string;
  title: string;
  description?: string;
  breadcrumb: string[];
  outputPathRelative: string;
  content: DocItem["content"];
  parentCategoryId?: string;
  ancestorCategoryIds: string[];
  isStandalone: boolean;
}