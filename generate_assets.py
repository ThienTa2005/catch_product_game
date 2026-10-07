"""Generate high-quality, colorful arcade product sprites with transparent backgrounds."""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

PRODUCTS_DIR = Path(__file__).resolve().parent / "assets" / "products"
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 256  # Base canvas for drawing, later resized or kept high-res

def create_star_coin() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = SIZE // 2, SIZE // 2
    r_outer = 110
    
    # Glow / shadow
    for i in range(15, 0, -1):
        alpha = int(120 * (1.0 - i / 15))
        d.ellipse((cx - r_outer - i, cy - r_outer - i, cx + r_outer + i, cy + r_outer + i), fill=(255, 200, 0, alpha))
    
    # Outer gold rim
    d.ellipse((cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer), fill="#F59E0B", outline="#D97706", width=6)
    
    # Inner face
    r_inner = 94
    d.ellipse((cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner), fill="#FBBF24", outline="#FDE68A", width=4)
    
    # Star in center
    def star_points(r_out, r_in, n=5):
        pts = []
        for i in range(2 * n):
            r = r_out if i % 2 == 0 else r_in
            angle = -math.pi / 2 + i * math.pi / n
            pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        return pts
    
    # Star shadow
    star_pts_shadow = [(x + 3, y + 4) for x, y in star_points(60, 26)]
    d.polygon(star_pts_shadow, fill="#D97706")
    # Star main
    d.polygon(star_points(60, 26), fill="#FFFBEB", outline="#F59E0B")
    
    # Shiny gloss reflection arc
    d.arc((cx - 80, cy - 80, cx + 80, cy + 80), start=200, end=300, fill=(255, 255, 255, 220), width=8)
    d.ellipse((cx - 45, cy - 55, cx - 25, cy - 35), fill=(255, 255, 255, 230))
    return im

def create_bubble_tea() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    
    # Straw
    straw_color = "#EC4899"
    d.polygon([(140, 20), (160, 20), (120, 140), (105, 140)], fill=straw_color)
    d.line([(148, 20), (112, 140)], fill="#F472B6", width=4)
    
    # Cup body trapezoid
    cup_top_w, cup_bot_w = 70, 50
    top_y, bot_y = 75, 230
    cx = SIZE // 2
    cup_poly = [
        (cx - cup_top_w, top_y),
        (cx + cup_top_w, top_y),
        (cx + cup_bot_w, bot_y),
        (cx - cup_bot_w, bot_y),
    ]
    
    # Milk tea liquid
    liquid_poly = [
        (cx - cup_top_w + 3, top_y + 25),
        (cx + cup_top_w - 3, top_y + 25),
        (cx + cup_bot_w - 4, bot_y - 6),
        (cx - cup_bot_w + 4, bot_y - 6),
    ]
    d.polygon(liquid_poly, fill="#E0A96D")  # Milk tea color
    
    # Tapioca pearls (Boba)
    pearls = [
        (cx - 30, bot_y - 20), (cx, bot_y - 18), (cx + 30, bot_y - 20),
        (cx - 15, bot_y - 38), (cx + 18, bot_y - 36), (cx - 32, bot_y - 50),
        (cx + 2, bot_y - 52), (cx + 30, bot_y - 48)
    ]
    for px, py in pearls:
        d.ellipse((px - 10, py - 10, px + 10, py + 10), fill="#291811", outline="#593B2B", width=2)
        d.ellipse((px - 5, py - 6, px - 1, py - 2), fill=(255, 255, 255, 160))
    
    # Cup outline & glass reflections
    d.polygon(cup_poly, outline="#CBD5E1", width=5)
    # Glass highlight left
    d.line([(cx - cup_top_w + 10, top_y + 15), (cx - cup_bot_w + 10, bot_y - 15)], fill=(255, 255, 255, 140), width=6)
    
    # Dome lid
    d.chord((cx - cup_top_w - 6, top_y - 35, cx + cup_top_w + 6, top_y + 25), start=180, end=360,
            fill=(255, 255, 255, 180), outline="#94A3B8", width=4)
    d.rounded_rectangle((cx - cup_top_w - 10, top_y - 6, cx + cup_top_w + 10, top_y + 8), radius=6,
                        fill="#CBD5E1", outline="#64748B", width=2)
    return im

def create_soda_can() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = SIZE // 2
    w, h = 60, 160
    top_y = 50
    bot_y = top_y + h
    
    # Can body
    d.rounded_rectangle((cx - w, top_y, cx + w, bot_y), radius=16, fill="#EF4444", outline="#B91C1C", width=4)
    # Wave stripe across can
    d.polygon([(cx - w + 4, top_y + 60), (cx + w - 4, top_y + 35), (cx + w - 4, top_y + 85), (cx - w + 4, top_y + 110)], fill="#F87171")
    d.polygon([(cx - w + 4, top_y + 70), (cx + w - 4, top_y + 45), (cx + w - 4, top_y + 60), (cx - w + 4, top_y + 85)], fill="#FFFFFF")
    
    # Silver top & bottom rims
    d.rounded_rectangle((cx - w + 6, top_y - 12, cx + w - 6, top_y + 8), radius=8, fill="#E2E8F0", outline="#94A3B8", width=3)
    d.rounded_rectangle((cx - w + 6, bot_y - 8, cx + w - 6, bot_y + 12), radius=8, fill="#CBD5E1", outline="#64748B", width=3)
    
    # Pull tab
    d.rounded_rectangle((cx - 12, top_y - 20, cx + 12, top_y - 10), radius=3, fill="#94A3B8")
    
    # Lightning / Star emblem
    d.text((cx - 14, top_y + 68), "★", fill="#FEF08A", font_size=32)
    
    # Gloss sheen
    d.line([(cx - w + 12, top_y + 10), (cx - w + 12, bot_y - 10)], fill=(255, 255, 255, 170), width=7)
    return im

def create_gift_box() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = SIZE // 2, SIZE // 2 + 10
    bw, bh = 130, 110
    
    # Box base
    d.rounded_rectangle((cx - bw//2, cy - bh//2, cx + bw//2, cy + bh//2), radius=12, fill="#8B5CF6", outline="#6D28D9", width=4)
    # Box lid
    lid_w, lid_h = bw + 14, 34
    d.rounded_rectangle((cx - lid_w//2, cy - bh//2 - 12, cx + lid_w//2, cy - bh//2 + lid_h - 12), radius=8, fill="#A78BFA", outline="#7C3AED", width=4)
    
    # Vertical Ribbon
    ribbon_w = 26
    d.rectangle((cx - ribbon_w//2, cy - bh//2 - 12, cx + ribbon_w//2, cy + bh//2), fill="#FBBF24")
    d.rectangle((cx - ribbon_w//2, cy - bh//2 - 12, cx + ribbon_w//2, cy + bh//2), outline="#D97706", width=2)
    
    # Horizontal Ribbon
    ribbon_h = 24
    d.rectangle((cx - bw//2, cy - ribbon_h//2 + 8, cx + bw//2, cy + ribbon_h//2 + 8), fill="#FBBF24")
    d.rectangle((cx - bw//2, cy - ribbon_h//2 + 8, cx + bw//2, cy + ribbon_h//2 + 8), outline="#D97706", width=2)
    
    # Bow on top
    bow_y = cy - bh//2 - 14
    # Left loop
    d.ellipse((cx - 42, bow_y - 28, cx - 4, bow_y + 4), fill="#FCD34D", outline="#D97706", width=3)
    # Right loop
    d.ellipse((cx + 4, bow_y - 28, cx + 42, bow_y + 4), fill="#FCD34D", outline="#D97706", width=3)
    # Center knot
    d.ellipse((cx - 14, bow_y - 14, cx + 14, bow_y + 12), fill="#F59E0B", outline="#B45309", width=3)
    
    # Sparkle star
    d.text((cx + 35, cy - 40), "✦", fill="#FEF08A", font_size=28)
    return im

def create_glazed_donut() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = SIZE // 2, SIZE // 2
    r_dough = 95
    
    # Dough
    d.ellipse((cx - r_dough, cy - r_dough, cx + r_dough, cy + r_dough), fill="#D97706", outline="#B45309", width=4)
    # Dough highlight bottom
    d.ellipse((cx - r_dough + 4, cy - r_dough + 4, cx + r_dough - 4, cy + r_dough - 4), fill="#F59E0B")
    
    # Pink Icing (Strawberry)
    r_icing = 86
    d.ellipse((cx - r_icing, cy - r_icing + 4, cx + r_icing, cy + r_icing - 2), fill="#F472B6")
    
    # Hole in middle
    r_hole = 34
    d.ellipse((cx - r_hole, cy - r_hole, cx + r_hole, cy + r_hole), fill=(0, 0, 0, 0))
    d.ellipse((cx - r_hole, cy - r_hole, cx + r_hole, cy + r_hole), outline="#B45309", width=3)
    
    # Rainbow Sprinkles
    sprinkles = [
        (-50, -40, 20, "#60A5FA"), (-20, -65, -30, "#34D399"), (35, -55, 45, "#FBBF24"),
        (60, -20, 15, "#A78BFA"), (-65, 10, -45, "#FFFFFF"), (55, 25, -20, "#34D399"),
        (-40, 50, 30, "#FBBF24"), (0, 65, 0, "#60A5FA"), (40, 50, -35, "#FFFFFF")
    ]
    for sx, sy, ang, col in sprinkles:
        px, py = cx + sx, cy + sy
        rad = math.radians(ang)
        dx, dy = math.cos(rad) * 9, math.sin(rad) * 9
        d.line([(px - dx, py - dy), (px + dx, py + dy)], fill=col, width=5)
    
    # Shiny gloss
    d.arc((cx - 75, cy - 75, cx + 75, cy + 75), start=210, end=270, fill=(255, 255, 255, 200), width=6)
    return im

def create_gem_diamond() -> Image.Image:
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = SIZE // 2, SIZE // 2
    
    top_y = cy - 65
    mid_y = cy - 10
    bot_y = cy + 85
    w_top = 65
    w_mid = 95
    
    # Facets
    # Bottom triangles
    d.polygon([(cx - w_mid, mid_y), (cx, bot_y), (cx - 30, mid_y)], fill="#06B6D4")
    d.polygon([(cx - 30, mid_y), (cx, bot_y), (cx + 30, mid_y)], fill="#22D3EE")
    d.polygon([(cx + 30, mid_y), (cx, bot_y), (cx + w_mid, mid_y)], fill="#0891B2")
    
    # Top trapezoids
    d.polygon([(cx - w_mid, mid_y), (cx - w_top, top_y), (cx - 25, top_y), (cx - 30, mid_y)], fill="#67E8F9")
    d.polygon([(cx - 25, top_y), (cx + 25, top_y), (cx + 30, mid_y), (cx - 30, mid_y)], fill="#A5F3FC")
    d.polygon([(cx + 25, top_y), (cx + w_top, top_y), (cx + w_mid, mid_y), (cx + 30, mid_y)], fill="#38BDF8")
    
    # Table (flat top)
    d.polygon([(cx - w_top, top_y), (cx + w_top, top_y), (cx + 25, top_y), (cx - 25, top_y)], fill="#CFFAFE")
    
    # Outlines
    outer_pts = [(cx - w_top, top_y), (cx + w_top, top_y), (cx + w_mid, mid_y), (cx, bot_y), (cx - w_mid, mid_y)]
    d.polygon(outer_pts, outline="#0E7490", width=4)
    d.line([(cx - 30, mid_y), (cx, bot_y), (cx + 30, mid_y)], fill="#0E7490", width=3)
    d.line([(cx - w_mid, mid_y), (cx + w_mid, mid_y)], fill="#0E7490", width=3)
    d.line([(cx - 25, top_y), (cx - 30, mid_y)], fill="#0E7490", width=2)
    d.line([(cx + 25, top_y), (cx + 30, mid_y)], fill="#0E7490", width=2)
    
    # Big gleam
    d.text((cx - 50, top_y - 15), "✦", fill="#FFFFFF", font_size=36)
    d.text((cx + 30, mid_y + 15), "✧", fill="#FFFFFF", font_size=24)
    return im

def main():
    generators = {
        "bubble_tea.png": create_bubble_tea,
        "soda_can.png": create_soda_can,
        "gift_box.png": create_gift_box,
        "star_coin.png": create_star_coin,
        "glazed_donut.png": create_glazed_donut,
        "gem_diamond.png": create_gem_diamond,
    }
    for name, gen_fn in generators.items():
        img = gen_fn()
        path = PRODUCTS_DIR / name
        img.save(path, format="PNG")
        print(f"Generated {name}")

if __name__ == '__main__':
    main()
