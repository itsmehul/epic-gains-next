import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const svgPath = join(publicDir, "logos", "logo.svg");

function oklchToHex(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toSrgb = (c) => {
    const clipped = Math.min(1, Math.max(0, c));
    const encoded =
      clipped <= 0.0031308
        ? 12.92 * clipped
        : 1.055 * clipped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  };
  return `#${[rLin, gLin, bLin].map((c) => toSrgb(c).toString(16).padStart(2, "0")).join("")}`;
}

const source = readFileSync(svgPath, "utf8");
const srgbSvg = source.replace(
  /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,
  (_, L, C, h) => oklchToHex(Number(L), Number(C), Number(h)),
);

function renderPng(size) {
  const resvg = new Resvg(srgbSvg, {
    fitTo: { mode: "width", value: size },
  });
  return resvg.render().asPng();
}

function writePng(rel, size) {
  writeFileSync(join(publicDir, rel), renderPng(size));
}

copyFileSync(svgPath, join(publicDir, "pwa-icon.svg"));
writePng("logos/logo.png", 1024);
writePng("splash_screens/icon.png", 512);
writePng("icons/icon512_rounded.png", 512);
writePng("icons/icon512_maskable.png", 512);
writePng("logos/favicon_io/android-chrome-512x512.png", 512);
writePng("logos/favicon_io/android-chrome-192x192.png", 192);
writePng("logos/favicon_io/apple-touch-icon.png", 180);
writePng("logos/favicon_io/favicon-32x32.png", 32);
writePng("logos/favicon_io/favicon-16x16.png", 16);

const py = `
from pathlib import Path
from PIL import Image

root = Path(${JSON.stringify(publicDir)})
icon = Image.open(root / "icons/icon512_rounded.png").convert("RGBA")

def save_sizes(path, sizes):
    frames = [icon.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]
    frames[0].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=frames[1:])

save_sizes(root / "logos/favicon_io/favicon.ico", [16, 32])
save_sizes(root / "favicon.ico", [16, 32])

apple = Image.open(root / "logos/favicon_io/apple-touch-icon.png").convert("RGB")
apple.save(root / "logos/favicon_io/apple-touch-icon.png", format="PNG")

bg = (0x1C, 0x18, 0x14, 255)
logo = icon

splash_dir = root / "splash_screens"
for path in sorted(splash_dir.glob("*.png")):
    if path.name == "icon.png":
        continue
    canvas = Image.open(path)
    w, h = canvas.size
    icon_size = round(min(w, h) * 0.22)
    mark = logo.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (w, h), bg)
    x = (w - icon_size) // 2
    y = (h - icon_size) // 2
    out.paste(mark, (x, y), mark)
    out.save(path, format="PNG", optimize=True)
    print(f"{path.name} {w}x{h} icon={icon_size}")
`;

const result = spawnSync("python3", ["-c", py], { encoding: "utf8" });
if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}
console.log(result.stdout);
console.log("Rasterized brand assets from logos/logo.svg");
