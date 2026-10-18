"""Draws the Snapfit app icons (a scale dial with a needle) into public/icons."""
from PIL import Image, ImageDraw
import math, os

TEAL, INK, WHITE, ORANGE = (12, 122, 98), (10, 60, 48), (255, 255, 255), (240, 160, 80)
out = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out, exist_ok=True)

def icon(size, maskable=False):
    s = size * 4  # draw large, then downsample for smooth edges
    img = Image.new("RGB", (s, s), TEAL)
    d = ImageDraw.Draw(img)
    pad = s * (0.24 if maskable else 0.16)
    box = [pad, pad, s - pad, s - pad]
    w = int(s * 0.07)
    d.arc(box, start=150, end=390, fill=WHITE, width=w)
    cx = cy = s / 2
    r = (s - 2 * pad) / 2
    for i in range(7):
        a = math.radians(150 + i * 40)
        r1, r2 = r * 0.62, r * 0.78
        d.line([cx + r1 * math.cos(a), cy + r1 * math.sin(a), cx + r2 * math.cos(a), cy + r2 * math.sin(a)], fill=WHITE, width=int(w * 0.45))
    a = math.radians(300)
    d.line([cx, cy, cx + r * 0.7 * math.cos(a), cy + r * 0.7 * math.sin(a)], fill=ORANGE, width=int(w * 0.8))
    k = w * 0.9
    d.ellipse([cx - k, cy - k, cx + k, cy + k], fill=ORANGE)
    return img.resize((size, size), Image.LANCZOS)

icon(192).save(os.path.join(out, "icon-192.png"))
icon(512).save(os.path.join(out, "icon-512.png"))
icon(512, maskable=True).save(os.path.join(out, "maskable-512.png"))
icon(180).save(os.path.join(out, "apple-touch-icon.png"))
print("icons written")
