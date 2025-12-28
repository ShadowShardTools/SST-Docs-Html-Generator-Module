import { describe, expect, it, beforeEach } from "vitest";
import type { RenderContext } from "../src/types/index.js";
import { renderContentBlock } from "../src/templates/blocks.ts";

const baseStyles = {
  text: {
    general: "text-general",
    documentTitle: "text-document-title",
    titleLevel1: "text-title-1",
    titleLevel2: "text-title-2",
    titleLevel3: "text-title-3",
    titleAnchor: "title-anchor",
    list: "text-list",
    alternative: "text-alt",
    math: "text-math",
  },
  sections: {
    titleBackground: "section-title-bg",
  },
  divider: {
    border: "divider-border",
    gradient: "divider-gradient",
    text: "divider-text",
  },
  messageBox: {
    neutral: "message-neutral",
    quote: "message-quote",
    warning: "message-warning",
  },
  table: {
    border: "table-border",
    rows: "table-rows",
    headers: "table-headers",
    cornerCell: "table-corner",
    empty: "table-empty",
  },
  code: {
    empty: "code-empty",
    header: "code-header",
    language: "code-language",
    lines: "code-lines",
  },
  buttons: {
    tabSmall: "button-tab-small",
  },
};

const createContext = (overrides: Partial<RenderContext> = {}): RenderContext => {
  const styles = JSON.parse(JSON.stringify(baseStyles));
  return {
    styles,
    basePath: "/docs/",
    currentPath: "doc/example",
    resolveAssetHref: (original: string) =>
      original.replace("/SST-Docs/data/v1/", "./"),
    getChartAssetHref: (chartData: any, width: number) => ({
      src: "./charts/example.png",
      width,
      height: 240,
    }),
    ...overrides,
  };
};

describe("renderContentBlock (title/text/list/divider)", () => {
  const ctx = createContext();

  it("renders title blocks with anchor links", () => {
    const html = renderContentBlock(ctx, {
      type: "title",
      titleData: {
        text: "Getting Started",
        level: 2,
        alignment: "center",
        spacing: "large",
        underline: true,
        enableAnchorLink: true,
      },
    } as any);

    expect(html).toContain("<h2");
    expect(html).toContain('href="#getting-started"');
  });

  it("renders text and ordered list blocks", () => {
    const textHtml = renderContentBlock(ctx, {
      type: "text",
      textData: {
        text: "Line 1\nLine 2",
        alignment: "left",
        spacing: "small",
      },
    } as any);
    expect(textHtml).toContain("Line 1");

    const listHtml = renderContentBlock(ctx, {
      type: "list",
      listData: {
        type: "ol",
        items: ["First", "Second"],
        startNumber: 3,
        inside: true,
        ariaLabel: "Steps",
      },
    } as any);
    expect(listHtml).toContain('<ol class="text-list');
    expect(listHtml).toContain('start="3"');
    expect(listHtml).toContain("First");
  });

  it("renders divider variants with text", () => {
    const dividerWithText = renderContentBlock(ctx, {
      type: "divider",
      dividerData: {
        type: "gradient",
        text: "Section break",
      },
    } as any);
    expect(dividerWithText).toContain("Section break");

    const simpleDivider = renderContentBlock(ctx, {
      type: "divider",
      dividerData: {
        type: "dotted",
      },
    } as any);
    expect(simpleDivider).toContain("border-t-2");
  });
});

describe("renderContentBlock (message, table, code, math)", () => {
  it("supports quote and neutral message boxes", () => {
    const ctx = createContext();
    const quoteHtml = renderContentBlock(ctx, {
      type: "messageBox",
      messageBoxData: {
        type: "quote",
        text: "Inspiring message",
      },
    } as any);
    expect(quoteHtml).toContain("blockquote");
    expect(quoteHtml).toContain("message-quote");

    const warningHtml = renderContentBlock(ctx, {
      type: "messageBox",
      messageBoxData: {
        type: "warning",
        size: "large",
        text: "Pay attention",
      },
    } as any);
    expect(warningHtml).toContain("message-warning");
  });

  it("renders tables and empty table state", () => {
    const ctx = createContext();
    const tableHtml = renderContentBlock(ctx, {
      type: "table",
      tableData: {
        type: "horizontal",
        data: [
          [
            { content: "Header", isHeader: true, scope: "col" },
            { content: "Value" },
          ],
          [
            { content: "Row 2", isHeader: true },
            { content: "42" },
          ],
        ],
      },
    } as any);
    expect(tableHtml).toContain("<table");
    expect(tableHtml).toContain("Header");
    expect(tableHtml).toContain("scope=");

    const emptyHtml = renderContentBlock(ctx, {
      type: "table",
      tableData: {
        data: [],
      },
    } as any);
    expect(emptyHtml).toContain("No data available");
  });

  it("renders multi-section code blocks and empty fallback", () => {
    const ctx = createContext();
    const codeHtml = renderContentBlock(ctx, {
      type: "code",
      codeData: {
        name: "Snippet",
        wrapLines: true,
        sections: [
          {
            language: "javascript",
            content: "console.log('hello');",
            filename: "index.js",
          },
          {
            language: "python",
            content: "print('hello')",
          },
        ],
      },
    } as any);
    expect(codeHtml).toContain("static-code-tab-labels");
    expect(codeHtml).toContain("code-block-");
    expect(codeHtml).toContain("Static snippet");

    const emptyHtml = renderContentBlock(ctx, {
      type: "code",
      codeData: {},
    } as any);
    expect(emptyHtml).toContain("No code content provided");
  });

  it("renders KaTeX math expressions with alignment", () => {
    const ctx = createContext();
    const mathHtml = renderContentBlock(ctx, {
      type: "math",
      mathData: {
        expression: "c = \\pm\\sqrt{a^2 + b^2}",
        alignment: "right",
      },
    } as any);
    expect(mathHtml).toContain("math-block");
    expect(mathHtml).toContain("sqrt");
  });
});

describe("renderContentBlock (media and interactive blocks)", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = createContext();
  });

  it("renders audio, image, and image grid content", () => {
    const audioHtml = renderContentBlock(ctx, {
      type: "audio",
      audioData: {
        src: "/SST-Docs/data/v1/media/audio.mp3",
        mimeType: "audio/mpeg",
        caption: "Audio caption",
      },
    } as any);
    expect(audioHtml).toContain("<audio");
    expect(audioHtml).toContain("audio/mpeg");
    expect(audioHtml).toContain("Audio caption");

    const imageHtml = renderContentBlock(ctx, {
      type: "image",
      imageData: {
        image: {
          src: "/SST-Docs/data/v1/media/image.png",
          alt: "Sample image",
        },
        alignment: "left",
        scale: 0.5,
      },
    } as any);
    expect(imageHtml).toContain("Sample image");
    expect(imageHtml).toContain("style=\"width:");

    const gridHtml = renderContentBlock(ctx, {
      type: "imageGrid",
      imageGridData: {
        alignment: "right",
        scale: 0.8,
        images: [
          { src: "/SST-Docs/data/v1/media/one.png", alt: "One" },
          { src: "/SST-Docs/data/v1/media/two.png", alt: "Two" },
        ],
      },
    } as any);
    expect(gridHtml).toContain("grid gap-4");
    expect(gridHtml).toContain("One");
  });

  it("renders carousel and compare image blocks", () => {
    const carouselHtml = renderContentBlock(ctx, {
      type: "imageCarousel",
      imageCarouselData: {
        images: [
          { src: "/SST-Docs/data/v1/media/slide1.png", alt: "Slide 1" },
          { src: "/SST-Docs/data/v1/media/slide2.png", alt: "Slide 2" },
        ],
      },
    } as any);
    expect(carouselHtml).toContain("static-carousel-input");
    expect(carouselHtml).toContain("static-carousel-slide");

    const compareData = {
      type: "slider",
      showPercentage: true,
      beforeImage: {
        src: "/SST-Docs/data/v1/media/before.png",
        alt: "Before",
      },
      afterImage: {
        src: "/SST-Docs/data/v1/media/after.png",
        alt: "After",
      },
    };

    const compareHtmlFirst = renderContentBlock(ctx, {
      type: "imageCompare",
      imageCompareData: compareData,
    } as any);
    expect(compareHtmlFirst).toContain("static-compare");
    expect(compareHtmlFirst).toContain("<script>(");

    const compareHtmlSecond = renderContentBlock(ctx, {
      type: "imageCompare",
      imageCompareData: compareData,
    } as any);
    expect(compareHtmlSecond).toContain("static-compare");
    expect(compareHtmlSecond).not.toContain("<script>(");
  });

  it("renders chart, youtube, and fallback blocks", () => {
    const chartHtml = renderContentBlock(
      createContext({
        getChartAssetHref: () => ({
          src: "./charts/chart.png",
          width: 480,
          height: 320,
        }),
      }),
      {
        type: "chart",
        chartData: {
          type: "bar",
          datasets: [{ label: "Visitors", data: [1, 2, 3] }],
        },
      } as any,
    );
    expect(chartHtml).toContain("chart.png");

    const chartFallback = renderContentBlock(
      createContext({ getChartAssetHref: () => null }),
      {
        type: "chart",
        chartData: { type: "line", datasets: [] },
      } as any,
    );
    expect(chartFallback).toContain("Chart preview unavailable");

    const youtubeHtml = renderContentBlock(ctx, {
      type: "youtube",
      youtubeData: {
        youtubeVideoId: "https://youtu.be/dQw4w9WgXcQ",
        caption: "Watch me",
        alignment: "center",
        scale: 0.8,
      },
    } as any);
    expect(youtubeHtml).toContain("youtube.com/embed");
    expect(youtubeHtml).toContain("Watch me");

    const unknownHtml = renderContentBlock(ctx, {
      type: "unsupported-block",
    } as any);
    expect(unknownHtml).toContain("Unsupported block type");

    const navigatorResult = renderContentBlock(ctx, {
      type: "categoryNavigator",
    } as any);
    expect(navigatorResult).toBeNull();
  });
});
