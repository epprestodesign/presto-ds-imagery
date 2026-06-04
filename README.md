# Presto DS — Imagery

Standalone, hosted image library for the [Presto DS](https://github.com/epprestodesign/presto-ds-v1)
design system. Curated hotel photography from [Unsplash](https://unsplash.com)
(see `CREDITS.md` and per-image `credit` in `manifest.json`).

## Hosted endpoints (GitHub Pages)
- Manifest: `https://epprestodesign.github.io/presto-ds-imagery/manifest.json`
- Images: `https://epprestodesign.github.io/presto-ds-imagery/<category>/<file>.jpg`

The design system fetches the manifest at runtime (`VITE_IMAGERY_URL`), so adding
images here makes them appear in Storybook/prototypes **without rebuilding the DS**.

## Add more images
```bash
cp .env.example .env   # add your Unsplash key
node build.mjs 12      # tops each category to 12 (rate-limit aware, re-runnable)
git add -A && git commit -m "add imagery" && git push
```
Pages redeploys automatically; the DS picks up the new manifest on next load.

Categories: rooms · suites · lobby · pool · spa · dining · bar · bathroom ·
exterior · views · destinations · guests · amenities.
