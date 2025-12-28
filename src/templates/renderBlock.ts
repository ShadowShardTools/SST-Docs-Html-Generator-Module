import type { Content } from "@shadow-shard-tools/docs-core";

import type { RenderContext } from "../types/RenderContext.js";

import { renderContentBlock } from "./blocks.js";

export const renderBlock = (block: Content, ctx: RenderContext) =>
  renderContentBlock(ctx, block);
