# YVZ Denim x ABOUT YOU — Launch Flyer

Instagram-Post-Flyer für den Launch von **YVZ Denim** auf **ABOUT YOU**,
gebaut per Code (Python / Pillow) mit den **echten** Marken-Logos
(von Brandfetch) auf einem echten YVZ-Denim-Bild.

## Inhalt
- `build_flyer.py` — erzeugt den Flyer (1080×1080, Instagram-Square)
- `flyer_yvz_aboutyou.png` / `.jpg` — fertiges Bild
- `yvz_logo.png` — YVZ Denim Logo (weiß, light theme)
- `ay_logo.png` — ABOUT YOU Logo (schwarz, dark theme)
- `yvz_bg.webp` — Hintergrund (YVZ Denim Coats & Jackets Kollektion)
- `Jost-Variable.ttf` — Brand-Font (Jost)
- `CAPTION.md` — Caption-Vorschläge (DE/EN + Hashtags)

## Build
```bash
pip install pillow
python3 build_flyer.py
```

## Design-Entscheidungen
- YVZ-Logo ist weiß → dunkle Denim-Blau-Platte (#136f99)
- ABOUT-YOU-Logo ist schwarz → weiße Platte
- Beide Platten exakt 440px breit, auf einer Höhe, × mittig
- Headline „Wir feiern unseren Launch“ mit Lesbarkeits-Scrim
