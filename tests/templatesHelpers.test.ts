import { describe, expect, it, vi } from "vitest";
import {
  resolveAssetPath,
  wrapWithSpacing,
  classNames,
} from "../src/templates/helpers.ts";
import type { RenderContext } from "../src/types/index.js";

const createContext = (
  overrides: Partial<RenderContext> = {},
): RenderContext => ({
  styles: {} as any,
  currentPath: "doc",
  ...overrides,
});

describe("template helpers", () => {
  it("resolves internal asset paths relative to the docs base", () => {
    const ctx = createContext();
    const resolved = resolveAssetPath(ctx, "static/logo.png");
    expect(resolved).toBe("/static/logo.png");
  });

  it("returns external paths as-is", () => {
    const ctx = createContext();
    const resolved = resolveAssetPath(ctx, "https://cdn.example.com/logo.svg");
    expect(resolved).toBe("https://cdn.example.com/logo.svg");
  });

  it("delegates to custom asset resolver when provided", () => {
    const resolver = vi.fn().mockReturnValue("../assets/logo.png");
    const ctx = createContext({ resolveAssetHref: resolver });
    const resolved = resolveAssetPath(ctx, "/SST-Docs/data/logo.png");
    expect(resolver).toHaveBeenCalledWith("/SST-Docs/data/logo.png");
    expect(resolved).toBe("../assets/logo.png");
  });

  it("wraps HTML with a spacing container when requested", () => {
    const wrapped = wrapWithSpacing("<div>content</div>", "large");
    expect(wrapped).toMatch(/^<div class="[^"]+">/);
    expect(wrapped).toContain("content");
  });

  it("combines class names while dropping empty values", () => {
    expect(classNames("one", undefined, false, "two")).toBe("one two");
  });
});
