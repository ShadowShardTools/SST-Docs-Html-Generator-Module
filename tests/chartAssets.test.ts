import { mkdtemp, readdir, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderCalls: Array<{ width: number; height: number }> = [];
const canvasInstances: any[] = [];

vi.mock("chart.js", () => {
  const defaults = {
    font: {},
    elements: {},
  };
  return {
    Chart: {
      register: vi.fn(),
      defaults,
    },
    BarElement: {},
    LineElement: {},
    ArcElement: {},
    PointElement: {},
    CategoryScale: {},
    LinearScale: {},
    LogarithmicScale: {},
    TimeScale: {},
    RadialLinearScale: {},
    Tooltip: {},
    Legend: {},
    Filler: {},
  };
});

vi.mock("chartjs-node-canvas", () => {
  const ChartJSNodeCanvas = vi.fn(function (this: any, options: any) {
    this.options = options;
    this.renderToBuffer = vi.fn(async () => {
      renderCalls.push({ width: options.width, height: options.height });
      return Buffer.from(`mock:${options.width}x${options.height}`);
    });
    canvasInstances.push(this);
  });
  return { ChartJSNodeCanvas };
});

const chartModulePromise = import("../src/render/chartAssets.ts");

describe("chart assets utilities", () => {
  beforeEach(() => {
    renderCalls.length = 0;
    canvasInstances.length = 0;
    vi.clearAllMocks();
  });

  it("computes chart dimensions within expected bounds", async () => {
    const { resolveChartRenderWidth, resolveChartRenderHeight } =
      await chartModulePromise;

    expect(resolveChartRenderWidth()).toBe(896);
    expect(resolveChartRenderWidth(0.2)).toBe(360);
    expect(resolveChartRenderWidth(1.5)).toBe(896);

    expect(resolveChartRenderHeight("radar", 420)).toBeGreaterThanOrEqual(420);
    expect(resolveChartRenderHeight("bar", 420)).toBeGreaterThan(0);
  });

  it("generates and retrieves chart assets", async () => {
    const { ChartAssetManager } = await chartModulePromise;

    const tempRoot = await mkdtemp(join(tmpdir(), "sst-chart-assets-"));
    const versionOutDir = join(tempRoot, "out");

    const logger = {
      debug: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    const manager = new ChartAssetManager(
      { chart: {} } as any,
      versionOutDir,
      logger,
    );

    const chartData = {
      type: "line",
      labels: ["A", "B"],
      datasets: [{ label: "Data", data: [1, 2] }],
      scale: 0.5,
    };

    await manager.prepareContent([
      {
        type: "chart",
        chartData,
      },
    ] as any);

    expect(renderCalls).toHaveLength(1);
    expect(renderCalls[0].width).toBe(448);
    expect(renderCalls[0].height).toBeGreaterThan(0);

    const chartsDir = join(versionOutDir, "charts");
    const files = await readdir(chartsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^chart-.*\.png$/);

    const assetList = manager.listAssets();
    expect(assetList).toEqual([`charts/${files[0]}`]);

    const pageDir = join(versionOutDir, "docs");
    await mkdir(pageDir, { recursive: true });
    const assetHref = manager.getAssetHref(
      chartData as any,
      pageDir,
      renderCalls[0].width,
    );
    expect(assetHref).toBeTruthy();
    expect(assetHref?.src).toMatch(/\.\.?\/charts\/.*\.png$/);
    expect(assetHref?.width).toBeGreaterThan(0);
    expect(assetHref?.height).toBeGreaterThan(0);

    const buffer = await readFile(join(chartsDir, files[0]));
    expect(buffer.toString()).toContain("mock");

    const missingHref = manager.getAssetHref(
      { type: "bar", datasets: [] } as any,
      pageDir,
      400,
    );
    expect(missingHref).toBeNull();

    await rm(tempRoot, { recursive: true, force: true });
  });
});
