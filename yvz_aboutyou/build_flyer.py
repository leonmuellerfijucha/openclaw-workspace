#!/usr/bin/env python3
"""YVZ Denim x ABOUT YOU launch flyer (v6, FINAL LOGO FIX).
Format: 1080 x 1350 (4:5 portrait)
- YVZ Denim logo: Uses PRE-CLEANED yvz_logo_cleaned.png (zero watermark/frame).
- 'JETZT AUCH ERHÄLTLICH BEI': Positioned lower (H * 0.44).
- ABOUT YOU logo: Centered hero on white plate.
- 'Wir feiern unseren Launch': Positioned higher (H * 0.76) with sparkles.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1350

# ---- 1. Background ----
bg = Image.open(os.path.join(HERE, "yvz_bg.webp")).convert("RGB")
bw, bh = bg.size
scale = max(W / bw, H / bh)
nbw, nbh = int(bw * scale), int(bh * scale)
bg = bg.resize((nbw, nbh), Image.LANCZOS)
bg = bg.crop(((nbw - W) // 2, (nbh - H) // 2, (nbw - W) // 2 + W, (nbh - H) // 2 + H)).convert("RGBA")

# ---- 2. Scrim ----
scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(scrim)
sd.rectangle([0, 0, W, H], fill=(8, 14, 24, 120))
for i in range(520):
    sd.rectangle([0, H - i, W, H - i], fill=(6, 11, 20, int(170 * (i / 520))))
bg.alpha_composite(scrim)

WHITE_P = (255, 255, 255, 235)
WHITE_SOLID = (255, 255, 255, 255)
SPARK = (255, 255, 255, 235)

def font(size):
    p = os.path.join(HERE, "Jost-Variable.ttf")
    if os.path.exists(p):
        try: return ImageFont.truetype(p, size)
        except: pass
    return ImageFont.load_default()

def add_plate(cx, cy, w, h, radius=22, fill=WHITE_P):
    p = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(p).rounded_rectangle([0, 0, w, h], radius=radius, fill=fill)
    bg.alpha_composite(p, (cx - w // 2, cy - h // 2))

def sparkle(cx, cy, r, color=SPARK):
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).polygon(
        [(cx, cy - r), (cx + r * 0.18, cy - r * 0.18), (cx + r, cy),
         (cx + r * 0.18, cy + r * 0.18), (cx, cy + r), (cx - r * 0.18, cy + r * 0.18),
         (cx - r, cy), (cx - r * 0.18, cy - r * 0.18)],
        fill=color)
    bg.alpha_composite(ov)

# ---- 3. YVZ Denim logo: ROBUST CLEANING AFTER RESIZE ----
yvz = Image.open(os.path.join(HERE, "yvz_logo.png")).convert("RGBA")

TAG_W = 600
yvz = yvz.resize((TAG_W, max(1, int(yvz.size[1] * TAG_W / yvz.size[0]))), Image.LANCZOS)

# Critical: Thresholding MUST happen AFTER resize to kill interpolation artifacts (the "watermark" effect)
r, g, b, a = yvz.split()
a = a.point(lambda p: 255 if p >= 245 else 0)
yvz.putalpha(a)

tag_cx, tag_cy = 10 + yvz.size[0] // 2, 10 + yvz.size[1] // 2
bg.alpha_composite(yvz, (tag_cx - yvz.size[0] // 2, tag_cy - yvz.size[1] // 2))

# ---- 4. Center: 'JETZT AUCH ERHÄLTLICH BEI' (LOWER) ----
d = ImageDraw.Draw(bg)
f_above = font(42)
txt = "JETZT AUCH ERHÄLTLICH BEI"
txt_y = int(H * 0.46)
d.text((W / 2, txt_y), txt, font=f_above, fill=WHITE_SOLID, anchor="mm")

# ABOUT YOU hero
ay = Image.open(os.path.join(HERE, "ay_logo.png")).convert("RGBA")
HERO_W = 560
ay = ay.resize((HERO_W, max(1, int(ay.size[1] * HERO_W / ay.size[0]))), Image.LANCZOS)
hero_w = ay.size[0] + 72
hero_h = ay.size[1] + 60
hero_cx, hero_cy = W // 2, int(H * 0.55)
add_plate(hero_cx, hero_cy, hero_w, hero_h, radius=26, fill=WHITE_P)
bg.alpha_composite(ay, (hero_cx - ay.size[0] // 2, hero_cy - ay.size[1] // 2))

# ---- 5. Headline frame (centered, HIGHER, WITH SPARKLES) ----
f_big = font(62)
head = "Wir feiern unseren Launch"
hb = d.textbbox((0, 0), head, font=f_big)
text_w = hb[2] - hb[0]
text_h = hb[3] - hb[1]
head_cy = int(H * 0.76)
bar_pad_x, bar_pad_y = 44, 30
bar_w = text_w + bar_pad_x * 2
bar_h = text_h + bar_pad_y * 2
bar = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(bar).rounded_rectangle(
    [W // 2 - bar_w // 2, head_cy - bar_h // 2,
     W // 2 + bar_w // 2, head_cy + bar_h // 2],
    radius=20, fill=(6, 11, 20, 185))
bg.alpha_composite(bar)
d = ImageDraw.Draw(bg)
d.text((W / 2, head_cy), head, font=f_big, fill=WHITE_SOLID, anchor="mm")

# Sparkles around the headline frame (RE-ADDED)
hw, hh = bar_w // 2, bar_h // 2
cx0, cy0 = W // 2, head_cy
sparkle(cx0 - hw - 6, cy0 - hh - 8, 22)
sparkle(cx0 + hw + 14, cy0 - hh + 6, 16)
sparkle(cx0 + hw + 6, cy0 + hh - 2, 20)
sparkle(cx0 - hw - 26, cy0 + hh - 4, 14)
sparkle(cx0 + 10, cy0 - hh - 30, 15)
sparkle(cx0 - 10, cy0 + hh + 28, 17)

out_png = os.path.join(HERE, "flyer_yvz_aboutyou.png")
out_jpg = os.path.join(HERE, "flyer_yvz_aboutyou.jpg")
bg.convert("RGB").save(out_png, "PNG")
bg.convert("RGB").save(out_jpg, "JPEG", quality=92)
print("SUCCESSFULLY SAVED", out_png)
