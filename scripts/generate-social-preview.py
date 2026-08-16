from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = PUBLIC / "social-preview.jpg"

W, H = 1200, 630
BG = (20, 16, 14, 255)
RED = (232, 88, 64, 255)
IVORY = (245, 240, 234, 255)
MUTED = (176, 168, 160, 255)
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def phone_frame(src: Image.Image, height: int) -> Image.Image:
    ratio = height / src.height
    width = round(src.width * ratio)
    scaled = src.resize((width, height), Image.Resampling.LANCZOS)
    radius = round(height * 0.08)
    frame_pad = 8
    outer_w, outer_h = width + frame_pad * 2, height + frame_pad * 2
    frame = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, outer_w - 1, outer_h - 1), radius + 4, fill=(8, 7, 6, 255))
    inner = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    inner.paste(scaled, (0, 0))
    inner.putalpha(rounded_mask((width, height), radius))
    frame.paste(inner, (frame_pad, frame_pad), inner)
    return frame


def main() -> None:
    canvas = Image.new("RGBA", (W, H), BG)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((620, -180, 1380, 520), fill=(232, 88, 64, 48))
    gdraw.ellipse((-220, 280, 420, 820), fill=(232, 88, 64, 22))
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(48)))

    draw = ImageDraw.Draw(canvas)
    logo = Image.open(PUBLIC / "logos" / "logo.png").convert("RGBA").resize((88, 88), Image.Resampling.LANCZOS)
    canvas.paste(logo, (72, 72), logo)

    title_font = ImageFont.truetype(FONT_BOLD, 56)
    brand_font = ImageFont.truetype(FONT_BOLD, 22)
    body_font = ImageFont.truetype(FONT_REG, 24)

    draw.text((176, 96), "Epic Gains", font=brand_font, fill=RED)
    draw.multiline_text(
        (72, 188),
        "Master YouTube\nworkouts into a\ncollection you own.",
        font=title_font,
        fill=IVORY,
        spacing=8,
    )
    draw.multiline_text(
        (72, 430),
        "Paste a link. Log the session.\nKeep it out of Watch Later.",
        font=body_font,
        fill=MUTED,
        spacing=6,
    )
    draw.text((72, 540), "Free forever  ·  MCP daily pulse", font=body_font, fill=IVORY)

    find = Image.open(PUBLIC / "screenshots" / "img-find.jpeg").convert("RGBA")
    progress = Image.open(PUBLIC / "screenshots" / "img-progress.jpeg").convert("RGBA")
    phone_a = phone_frame(find, 520)
    phone_b = phone_frame(progress, 480)

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((730, 90, 1120, 600), 48, fill=(0, 0, 0, 90))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(18)))
    canvas.paste(phone_b, (820, 86), phone_b)
    canvas.paste(phone_a, (640, 56), phone_a)

    rgb = Image.new("RGB", (W, H), (20, 16, 14))
    rgb.paste(canvas, mask=canvas.split()[-1])
    rgb.save(OUT, format="JPEG", quality=92, optimize=True)
    print(f"Wrote {OUT} {W}x{H}")


if __name__ == "__main__":
    main()
