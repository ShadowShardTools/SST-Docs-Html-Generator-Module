import type { Content } from "@shadow-shard-tools/docs-core";
import type { RenderContext } from "./RenderContext.js";

export type BlockRenderer = (
  ctx: RenderContext,
  block: Content,
) => string | null;
