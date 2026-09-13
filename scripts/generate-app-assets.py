# 生成安卓应用图标与启动屏(品牌:哈哈健身,主色 #FF4F00)。
# 运行一次即可,产物直接覆盖 android/app/src/main/res/ 下对应文件并提交入库:
#   python scripts/generate-app-assets.py
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

RES = Path(__file__).resolve().parent.parent / "android" / "app" / "src" / "main" / "res"
ORANGE = (255, 79, 0, 255)          # --accent
WHITE = (255, 255, 255, 255)

def font(size):
    for cand in [r"C:\Windows\Fonts\msyhbd.ttc", r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]:
        if Path(cand).exists():
            try:
                return ImageFont.truetype(cand, size)
            except OSError:
                continue
    raise SystemExit("找不到中文字体")

def dumbbell(size):
    """画一个白色哑铃,返回透明背景 RGBA 图。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bar_h = size * 0.075
    bar_w = size * 0.46
    cx, cy = size / 2, size / 2
    # 杆
    d.rounded_rectangle([cx - bar_w / 2, cy - bar_h / 2, cx + bar_w / 2, cy + bar_h / 2],
                        radius=bar_h / 2, fill=WHITE)
    # 两侧配重片(一大一小)
    plate_w, gap = size * 0.085, size * 0.10
    for side in (-1, 1):
        x0 = cx + side * (bar_w / 2 - plate_w)
        d.rounded_rectangle([x0 - plate_w / 2, cy - size * 0.145, x0 + plate_w / 2, cy + size * 0.145],
                            radius=plate_w * 0.35, fill=WHITE)   # 大片
        x1 = cx + side * (bar_w / 2 + gap + plate_w / 2)
        d.rounded_rectangle([x1 - plate_w / 2, cy - size * 0.24, x1 + plate_w / 2, cy + size * 0.24],
                            radius=plate_w * 0.35, fill=WHITE)   # 外侧大片
    # 轻微倾斜,更有运动感
    return img.rotate(-18, resample=Image.BICUBIC, expand=False)

def legacy_icon(size):
    """圆角方形底 + 哑铃,用于 Android 7 及以下与老启动器。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=ORANGE)
    glyph = dumbbell(int(size * 0.62))
    img.alpha_composite(glyph, (int(size * 0.19), int(size * 0.19)))
    return img

def adaptive_foreground(size):
    """自适应图标前景:哑铃须落在中央 66% 安全区内。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glyph = dumbbell(int(size * 0.42))
    img.alpha_composite(glyph, (int(size * 0.29), int(size * 0.29)))
    return img

def splash(w, h):
    """启动屏:品牌底色 + 哑铃 + 应用名。"""
    img = Image.new("RGB", (w, h), ORANGE[:3])
    base = min(w, h)
    glyph = dumbbell(int(base * 0.30))
    total_h = int(base * 0.30) + int(base * 0.055) + int(base * 0.13)
    y0 = (h - total_h) // 2
    img.paste(glyph, ((w - glyph.width) // 2, y0), glyph)
    d = ImageDraw.Draw(img)
    f = font(int(base * 0.105))
    text = "哈哈健身"
    tw = d.textlength(text, font=f)
    d.text(((w - tw) / 2, y0 + int(base * 0.30) + int(base * 0.055)), text, font=f, fill=WHITE)
    return img

# ── 图标 ──────────────────────────────────────────
DPI = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for dpi, scale in DPI.items():
    folder = RES / f"mipmap-{dpi}"
    folder.mkdir(exist_ok=True)
    legacy_icon(round(48 * scale)).save(folder / "ic_launcher.png")
    legacy_icon(round(48 * scale)).save(folder / "ic_launcher_round.png")
    adaptive_foreground(round(108 * scale)).save(folder / "ic_launcher_foreground.png")
    print(f"mipmap-{dpi}: launcher + foreground 完成")

# ── 自适应图标背景色 ────────────────────────────────
(RES / "values").mkdir(exist_ok=True)
(RES / "values" / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FF4F00</color>\n</resources>\n',
    encoding="utf-8")

# ── 启动屏:覆盖模板里所有 splash.png ───────────────
for splash_png in RES.glob("drawable*/splash.png"):
    from PIL import Image as I
    w, h = I.open(splash_png).size
    splash(w, h).save(splash_png)
    print(f"{splash_png.name} ({w}x{h}) 完成")

print("全部资源生成完毕")
