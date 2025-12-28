import { join } from "node:path";

export function joinUrl(...parts: string[]) {
  const cleaned = parts
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  if (cleaned.length === 0) return "/";
  return `/${cleaned.join("/")}/`;
}

export function joinRelativePath(...segments: string[]) {
  return join(...segments);
}
