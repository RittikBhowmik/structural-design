# AGENTS.md — structural-codes (Structural Design)

Static site of structural-engineering calculators, deployed to **Cloudflare Pages** (autodeploy on commit). No build runs at deploy time — committed files are served directly.

## Layout
- `index.html` — landing page. Must link tools to their **built** entry, not dev entries.
- `tools/beam-calculator/` — React 19 + Vite + Tailwind SPA.
  - `src/` — source (`main.tsx`, `App.tsx`, `components/`, `lib/`, `index.css`).
  - `dist/index.html` — **prebuilt, committed** single-file SPA served in production.
  - `index.html` — Vite dev entry. Loads `src="/src/main.tsx"` (absolute) and is a 404 in production. Used only by `npm run dev`.
- `tools/rebar-development-length/index.html`, `tools/latex-to-word/index.html` — standalone static pages (link with `index.html`).
- `_redirects` — Cloudflare Pages routing.

## Beam calculator: dev / build / verify
- `cd tools/beam-calculator`
- `npm install` (Node 20.19+ or 22.12+; Vite 7.3 warns on 22.11 but still builds.)
- `npm run dev` — local dev, `http://localhost:5173`.
- `npm run build` — rebuilds `dist/index.html` (single-file via `vite-plugin-singlefile`). **Commit the regenerated `dist/index.html`.**
- Typecheck: `npx tsc --noEmit` (tsconfig has `strict`, `noUnusedLocals`).

## Critical gotcha — beam calculator links (causes white page)
- Link to `tools/beam-calculator/dist/index.html`, **never** `tools/beam-calculator/`.
- `tools/beam-calculator/` resolves to the dev entry `tools/beam-calculator/index.html`, which references the absolute path `/src/main.tsx` → 404 → empty `#root` → white page. Cloudflare serves the static dev `index.html` before `_redirects` rules are evaluated, so the SPA fallback never fires.
- The root `_redirects` rule `/tools/beam-calculator/* -> /tools/beam-calculator/dist/index.html 200` only covers sub-paths that have no static file; it does not override the dev `index.html`.

## Git / deploy notes
- `dist/` is gitignored. The exception is `!tools/beam-calculator/dist/` (hyphens, not spaces).
- No root `package.json`; the root is served as static files.
