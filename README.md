# SST Docs HTML Generator Module

Reusable static HTML generator used by SST Docs.

## Usage

1. Install dependencies and build assets in your docs project so the generator can copy compiled CSS from `dist/assets`.
2. Provide docs JSON data root (defaults to `public/SST-Docs/data`).
3. Run via CLI:
   ```bash
   npx sst-docs-html --data ./public/SST-Docs/data --out ./dist-static
   ```

Programmatic usage:

```ts
import { generateStaticHtml } from "@shadowshard/docs-html-generator";

await generateStaticHtml({
  dataRoot: "./public/SST-Docs/data",
  outDir: "./dist-static",
  basePath: "/",
});
```

## Development

- `npm run build` emits ESM output in `dist/` (bundled via `tsc`).
- The CLI entry point is published as `sst-docs-html` and mirrors the existing flags from the monorepo script.
- Chart rendering uses `chartjs-node-canvas`; ensure native dependencies are available in your runtime.
