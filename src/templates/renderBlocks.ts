import type { Content } from "@shadow-shard-tools/docs-core";

import type { RenderContext } from "../types/index.js";

import { renderBlock } from "./renderBlock.js";

export const renderBlocks = (content: Content[], ctx: RenderContext) => {
  return content
    .map((block) => renderBlock(block, ctx))
    .filter((fragment): fragment is string => typeof fragment === "string")
    .join("\n");
};
