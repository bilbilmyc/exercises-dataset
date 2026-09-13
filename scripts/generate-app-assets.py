# 生成安卓应用图标与启动屏(品牌:哈哈健身)。
# 运行一次即可,产物直接覆盖 android/app/src/main/res/ 下对应文件并提交入库:
#   python scripts/generate-app-assets.py [--style barbell|ha|light]
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import sys

RES = Path(__file__).resolve().parent.parent / "android" / "app" / "src" / "main" / "res"
ORANGE = (255, 79, 0)
ORANGE_DEEP = (222, 54, 0)
WHITE = (255, 255, 255)
STYLE = "barbell"
if "--style" in sys.argv:
    STYLE = sys.argv[sys.argv.index("--style") + 1]

def font(size):
    for cand in [r"C:\Windows\Fonts\msyhbd.ttc", r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]:
        if Path(cand).exists():
            try:
                return ImageFont.truetype(cand, size)
            except OSError:
                continue
    raise SystemExit("找不到中文字体")

def gradient(size, c1, c2):
    """对角渐变(左上 c1 → 右下 c2)。"""
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))
    return small.resize(size, Image.BILINEAR)

def dumbbell(size, color, shadow_alpha=70):
    """圆形配重片的杠铃,4x 超采样抗锯齿,带柔和投影。-30° 倾斜。"""
    ss = 4
    sz = size * ss
    img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = sz / 2, sz / 2

    def plate(x_off, h, w):
        d.rounded_rectangle([cx + x_off - w / 2, cy - h / 2, cx + x_off + w / 2, cy + h / 2],
                            radius=w * 0.40, fill=color)

    # 两端小圆头 + 粗杆
    r_end = sz * 0.05
    for side in (-1, 1):
        d.ellipse([cx + side * sz * 0.27 - r_end, cy - r_end, cx + side * sz * 0.27 + r_end, cy + r_end], fill=color)
    d.rounded_rectangle([cx - sz * 0.27, cy - sz * 0.045, cx + sz * 0.27, cy + sz * 0.045],
                        radius=sz * 0.045, fill=color)
    # 每侧两片配重:内片矮、外片高(加粗比例,小尺寸下依然清晰)
    for side in (-1, 1):
        plate(side * sz * 0.315, sz * 0.40, sz * 0.115)
        plate(side * sz * 0.195, sz * 0.28, sz * 0.105)

    img = img.rotate(-30, resample=Image.BICUBIC)

    if shadow_alpha:
        alpha = img.getchannel("A").point(lambda a: shadow_alpha if a > 10 else 0)
        shadow = Image.new("RGBA", (sz, sz), (90, 20, 0, 0))
        shadow.putalpha(alpha)
        shadow = shadow.filter(ImageFilter.GaussianBlur(sz * 0.02))
        out = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        out.alpha_composite(shadow, (0, int(sz * 0.03)))
        out.alpha_composite(img)
        img = out

    return img.resize((size, size), Image.LANCZOS)

def char_mark(size, color):
    """「哈」字标。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(int(size * 0.78))
    d.text((size / 2, size * 0.53), "哈", font=f, fill=color, anchor="mm")
    return img

def glyph_for_style(size, color):
    return char_mark(size, color) if STYLE == "ha" else dumbbell(size, color)

def legacy_icon(size, light=False):
    """圆角方形 + 渐变底 + 图形(旧启动器 / Android 7-)。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.23), fill=255)
    if light:
        base = gradient((size, size), (255, 255, 255), (255, 236, 226))
        glyph = glyph_for_style(int(size * 0.62), ORANGE + (255,))
    else:
        base = gradient((size, size), ORANGE, ORANGE_DEEP)
        glyph = glyph_for_style(int(size * 0.60), WHITE + (255,))
    img.paste(base, (0, 0))
    img.alpha_composite(glyph, (int(size * 0.20), int(size * 0.20)))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def adaptive_foreground(size):
    """自适应图标前景:图形落在中央 66% 安全区。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glyph = glyph_for_style(int(size * 0.40), WHITE + (255,))
    img.alpha_composite(glyph, (int(size * 0.30), int(size * 0.30)))
    return img

def splash(w, h, light=False):
    """启动屏:渐变底 + 图形 + 应用名。"""
    img = gradient((w, h), ORANGE, ORANGE_DEEP) if not light else gradient((w, h), (255, 255, 255), (255, 236, 226))
    base = min(w, h)
    glyph = glyph_for_style(int(base * 0.26), WHITE + (255,) if not light else ORANGE + (255,))
    text_color = WHITE if not light else ORANGE
    f = font(int(base * 0.10))
    total = int(base * 0.26) + int(base * 0.05) + int(base * 0.12)
    y0 = (h - total) // 2
    img.paste(glyph, ((w - glyph.width) // 2, y0), glyph)
    d = ImageDraw.Draw(img)
    text = "哈哈健身"
    tw = d.textlength(text, font=f)
    # 文字带一点柔影,更精神
    tx, ty = (w - tw) / 2, y0 + int(base * 0.26) + int(base * 0.05)
    if not light:
        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).text((tx, ty + base * 0.006), text, font=f, fill=(120, 30, 0, 110))
        img.paste(Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB"), (0, 0))
    d = ImageDraw.Draw(img)
    d.text((tx, ty), text, font=f, fill=text_color)
    return img

DPI = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
light = STYLE == "light"
for dpi, scale in DPI.items():
    folder = RES / f"mipmap-{dpi}"
    folder.mkdir(exist_ok=True)
    legacy_icon(round(48 * scale), light).save(folder / "ic_launcher.png")
    legacy_icon(round(48 * scale), light).save(folder / "ic_launcher_round.png")
    adaptive_foreground(round(108 * scale)).save(folder / "ic_launcher_foreground.png")
    print(f"mipmap-{dpi} 完成")

(RES / "values").mkdir(exist_ok=True)
# light 方案下自适应图标背景改白,其余保持品牌橙
bg = "#FFFFFF" if light else "#FF4F00"
(RES / "values" / "ic_launcher_background.xml").write_text(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{bg}</color>\n</resources>\n',
    encoding="utf-8")

for splash_png in RES.glob("drawable*/splash.png"):
    from PIL import Image as I
    w, h = I.open(splash_png).size
    splash(w, h, light).save(splash_png)
print(f"启动屏完成 (style={STYLE})")
print("全部资源生成完毕")
