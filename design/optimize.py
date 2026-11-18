from PIL import Image
import os, glob

A = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
A = os.path.normpath(A)


def convert(src_name, dst_name, width, quality):
    src = os.path.join(A, src_name)
    dst = os.path.join(A, dst_name)
    img = Image.open(src)
    if img.mode not in ("RGBA", "RGB"):
        img = img.convert("RGBA")
    ratio = width / img.width
    height = int(round(img.height * ratio))
    img = img.resize((width, height), Image.LANCZOS)
    img.save(dst, "WEBP", quality=quality, method=6)
    before = os.path.getsize(src) / 1024
    after = os.path.getsize(dst) / 1024
    print(f"{dst_name:16s} {width}x{height}  {before:8.1f} KB -> {after:7.1f} KB")


convert("sky.jpg", "sky.webp", 1600, 76)
convert("pad.png", "pad.webp", 900, 88)
for i in range(1, 7):
    convert(f"cover-{i}.jpg", f"cover-{i}.webp", 400, 74)

total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(A, "*.webp"))) / 1024
print(f"\nWEBP total: {total:.1f} KB")
