import type { NavCategoryEntry } from "./NavCategoryEntry.js";
import type { NavDocumentEntry } from "./NavDocumentEntry.js";

export interface NavigationIndex {
  versionBaseUrl: string;
  versionId: string;
  versionLabel: string;
  categories: Map<string, NavCategoryEntry>;
  documents: Map<string, NavDocumentEntry>;
  tree: NavCategoryEntry[];
  standaloneDocuments: NavDocumentEntry[];
}