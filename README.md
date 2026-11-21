# Neon Coast Cover Studio

An offline web app that turns your own photos and a caption into multi-panel,
Vice-City-style cover art — the classic poster grid with a sunset or neon
colour grade, bold display lettering, a star "heat" meter and a badge ribbon —
exported as a PNG in the common post sizes (1080 × 1080, 1080 × 1350,
1920 × 1080). Everything runs in the browser from static files: your photos
never leave your machine.

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/dhosmatullah/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/dhosmatullah/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Entry for the make.fun competition
[Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01). All artwork,
lettering and code are original: no Rockstar Games logo, artwork or font is
used. The display fonts (Anton and Pacifico) are vendored under the SIL Open
Font License in `app/fonts/`.

## Features

- Four panel layouts: the classic 9-panel cover grid, Hero + Trio, a
  5-panel mosaic and a full-bleed single photo.
- Any photo: load several photos from your machine, spread them across the
  panels or fill every panel with one; click a panel to select it, drag to
  pan its photo, scroll or slide to zoom, cycle which photo a panel shows.
- Four gradient-map colour grades — Vice Sunset, Neon Nights, Golden Hour,
  Pastel Vice — with an adjustable grade strength, so unrelated photos sit
  together as one poster.
- Original poster furniture drawn in code: sunset title band with skyline
  and banded sun, palm silhouettes, a five-star heat meter, a badge ribbon,
  film grain and a vignette.
- Caption lettering in the genre's style: big condensed display lines with
  an inked outline and a pink script subtitle, both editable.
- One-click PNG export at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Run it

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

Open `app/index.html` from any static server, load a photo, arrange the
panels, write your caption and export the PNG.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with
`vendor/makefun-app.ts`.

## License

MIT — see `LICENSE`.
