import { type Category, type DocItem, type ResolvedSstDocsConfig } from "@shadow-shard-tools/docs-core";
import { joinRelativePath, joinUrl } from "../../utilities/paths.js";
import type { NavCategoryEntry, NavDocumentEntry, NavigationIndex, VersionRenderEntry } from "../../types/index.js";

const CATEGORY_DIR = "categories";
const DOC_DIR = "docs";

const createCategoryOutput = (categoryId: string) =>
  joinRelativePath(CATEGORY_DIR, categoryId, "index.html");

const createDocOutput = (docId: string) =>
  joinRelativePath(DOC_DIR, docId, "index.html");

const makeCategoryEntry = ({
  category,
  parentCategoryId,
  ancestorCategoryIds,
  breadcrumb,
}: {
  category: Category;
  parentCategoryId?: string;
  ancestorCategoryIds: string[];
  breadcrumb: string[];
}): NavCategoryEntry => {
  return {
    id: category.id,
    title: category.title,
    description: category.description,
    breadcrumb,
    outputPathRelative: createCategoryOutput(category.id),
    content: category.content ?? [],
    docs: category.docs?.map((doc) => doc.id) ?? [],
    childCategories: category.children?.map((child) => child.id) ?? [],
    parentCategoryId,
    ancestorCategoryIds,
  };
};

const makeDocumentEntry = ({
  doc,
  parentCategoryId,
  ancestorCategoryIds,
  breadcrumb,
  isStandalone,
}: {
  doc: DocItem;
  parentCategoryId?: string;
  ancestorCategoryIds: string[];
  breadcrumb: string[];
  isStandalone: boolean;
}): NavDocumentEntry => {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    breadcrumb,
    outputPathRelative: createDocOutput(doc.id),
    content: doc.content,
    parentCategoryId,
    ancestorCategoryIds,
    isStandalone,
  };
};

export const buildNavigationIndex = (
  entry: VersionRenderEntry,
  config: ResolvedSstDocsConfig,
): NavigationIndex => {
  const baseUrl = joinUrl(
    config.PUBLIC_DATA_PATH,
    entry.product?.product ?? "",
    entry.version.version,
  );
  const categories = new Map<string, NavCategoryEntry>();
  const documents = new Map<string, NavDocumentEntry>();
  const treeEntries: NavCategoryEntry[] = [];

  const traverseCategory = (
    category: Category,
    breadcrumbTrail: string[],
    ancestorIds: string[],
  ): NavCategoryEntry => {
    const currentBreadcrumb = [...breadcrumbTrail, category.title];
    const currentAncestorIds = [...ancestorIds, category.id];
    const parentCategoryId =
      ancestorIds.length > 0 ? ancestorIds[ancestorIds.length - 1] : undefined;
    const categoryEntry = makeCategoryEntry({
      category,
      parentCategoryId,
      ancestorCategoryIds: ancestorIds,
      breadcrumb: currentBreadcrumb,
    });

    categories.set(category.id, categoryEntry);

    category.docs?.forEach((doc) => {
      const docEntry = makeDocumentEntry({
        doc,
        parentCategoryId: category.id,
        ancestorCategoryIds: currentAncestorIds,
        breadcrumb: [...currentBreadcrumb, doc.title],
        isStandalone: false,
      });
      documents.set(doc.id, docEntry);
    });

    category.children?.forEach((child) => {
      traverseCategory(child, currentBreadcrumb, currentAncestorIds);
    });

    return categoryEntry;
  };

  entry.tree.forEach((category) => {
    const navCategory = traverseCategory(category, [], []);
    treeEntries.push(navCategory);
  });

  const standaloneDocuments = entry.standaloneDocs.map((doc) => {
    const navDoc = makeDocumentEntry({
      doc,
      parentCategoryId: undefined,
      ancestorCategoryIds: [],
      breadcrumb: [doc.title],
      isStandalone: true,
    });
    documents.set(doc.id, navDoc);
    return navDoc;
  });

  return {
    versionBaseUrl: baseUrl,
    versionId: entry.version.version,
    versionLabel: entry.version.label ?? entry.version.version,
    categories,
    documents,
    tree: treeEntries,
    standaloneDocuments,
  };
};
