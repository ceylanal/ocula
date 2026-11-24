# Ocula / OkurLab

A Turkish-language reading app for importing books, taking notes, and practicing reading speed and focus. The app is called **OkurLab** in the live interface.

[Open the live app](https://ocula-read.vercel.app)

## What you can try

- Start with the bundled sample book, or import a PDF, EPUB, TXT, or Markdown file. PDF import requires a selectable text layer, and EPUB files must be free of DRM.
- Highlight passages and keep notes alongside the text.
- Try the speed test or practice with a reading pacer, a rapid word display, or a Schulte table.
- Use browser-based Piper narration. Download a voice model before using that voice offline.
- Connect Supabase for account, cloud sync, and sharing features.

## Run locally

Use Node.js 20, the version used by the CI workflow.

```bash
git clone https://github.com/ceylanal/ocula.git
cd ocula
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) to try the reader and bundled sample book. For cloud features, copy [`.env.example`](.env.example) to `.env.local`, configure your own Supabase project, and apply [`supabase/schema.sql`](supabase/schema.sql). The example file documents the optional server-side Gemini key for comprehension questions.

## Checks

The [GitHub Actions workflow](.github/workflows/ci.yml) runs the TypeScript check, lint, Vitest suite, Supabase row-level security tests, and production build.

```bash
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
```

## Code map

| Path | Purpose |
| --- | --- |
| [`src/lib/fileParser.ts`](src/lib/fileParser.ts) | Book import and text extraction |
| [`src/components/reader/`](src/components/reader/) | Highlights and notes |
| [`src/components/drills/`](src/components/drills/) | Reading exercises |
| [`public/sw.js`](public/sw.js) | Service worker and offline caching |
| [`supabase/`](supabase/) | Database schema and row-level security tests |
