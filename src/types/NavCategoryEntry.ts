import type { Category } from "@shadow-shard-tools/docs-core";

export interface NavCategoryEntry {
  id: string;
  title: string;
  description?: string;
  breadcrumb: string[];
  outputPathRelative: string;
  content: Category["content"];
  docs: string[];
  childCategories: string[];
  parentCategoryId?: string;
  ancestorCategoryIds: string[];
}