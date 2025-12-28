import type { ChartData, StyleTheme } from "@shadow-shard-tools/docs-core";

export interface RenderContext {
  styles: StyleTheme;
  currentPath: string;
  resolveAssetHref?: (original: string) => string;
  getChartAssetHref?: (
    chartData: ChartData,
    targetWidth: number,
  ) => { src: string; width: number; height: number } | null;
}