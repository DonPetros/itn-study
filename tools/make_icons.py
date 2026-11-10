#!/usr/bin/env python3
"""Generate calm, simple PWA icons: a three-node network on a teal square."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "icons"
OUT.mkdir(exist_ok=True)
TEAL = (15, 92, 92, 255)
TEAL_DEEP = (10, 64, 64, 255)
WHITE = (255, 255, 255, 255)
MINT = (214, 236, 234, 255)


def draw_mark(size, pad_ratio=0.0, bg=TEAL):
    img = Image.new("RGBA", (size, size), bg)
    d = ImageDraw.Draw(img)
    # Safe area for maskable icons: keep the mark in the centre ~60%.
    inset = size * pad_ratio
    inner = size - 2 * inset

    def P(x, y):
        return (inset + x * inner, inset + y * inner)

    # Soft plate
    plate = [P(0.14, 0.14), P(0.86, 0.86)]
    r = inner * 0.22
    d.rounded_rectangle(plate, radius=r, fill=TEAL_DEEP if bg[0] != TEAL_DEEP[0] else (8, 52, 52, 255))
    if bg[3] == 0:
        # transparent canvas: draw a rounded teal square first
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        margin = size * 0.06
        d.rounded_rectangle([margin, margin, size - margin, size - margin], radius=size * 0.22, fill=TEAL)

    # Rebind points if we recreated the image
    inset = size * pad_ratio
    inner = size - 2 * inset

    def P(x, y):
        return (inset + x * inner, inset + y * inner)

    nodes = [P(0.32, 0.30), P(0.68, 0.30), P(0.50, 0.70)]
    width = max(3, int(size * 0.035))
    d.line([nodes[0], nodes[1]], fill=MINT, width=width)
    d.line([nodes[0], nodes[2]], fill=MINT, width=width)
    d.line([nodes[1], nodes[2]], fill=MINT, width=width)
    rnode = max(5, int(size * 0.07))
    for n in nodes:
        d.ellipse([n[0] - rnode, n[1] - rnode, n[0] + rnode, n[1] + rnode], fill=WHITE)
    return img


def main():
    # Apple touch and standard icons: opaque rounded-square look (full bleed)
    for size, name in [(180, "icon-180.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        draw_mark(size, pad_ratio=0.0, bg=TEAL).save(OUT / name, "PNG")
    # Maskable: extra padding so the mark stays in the safe zone
    draw_mark(512, pad_ratio=0.18, bg=TEAL).save(OUT / "icon-maskable-512.png", "PNG")
    draw_mark(32, pad_ratio=0.0, bg=TEAL).save(OUT / "favicon-32.png", "PNG")
    print("wrote icons in", OUT)


if __name__ == "__main__":
    main()
