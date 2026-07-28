import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
input_path = os.path.join(HERE, "yvz_logo.png")
output_path = os.path.join(HERE, "yvz_logo_cleaned.png")

if not os.path.exists(input_path):
    print(f"Error: {input_path} not found.")
    exit(1)

img = Image.open(input_path).convert("RGBA")
r, g, b, a = img.split()

# Aggressive threshold: only keep pixels that are very opaque
# Given the alpha values [0, 14, ..., 233, 255], 245 is a safe bet to keep only 255.
a = a.point(lambda p: 255 if p >= 245 else 0)

img.putalpha(a)
img.save(output_path)
print(f"SUCCESS: Cleaned logo saved to {output_path}")

# Verification
new_img = Image.open(output_path).convert("RGBA")
new_alphas = set(p[3] for p in new_img.getdata())
print(f"New Alpha Values: {sorted(list(new_alphas))}")
