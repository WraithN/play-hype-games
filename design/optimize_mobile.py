from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
RAW = os.path.join(os.environ.get("TEMP", "/tmp"), "ph-ref")

# 竖版背景：从原图中央裁出竖幅，适配手机
src = Image.open(os.path.join(RAW, "bg.jpg")).convert("RGB")
w, h = src.size
cw = int(h * 0.66)            # 600:908 ≈ 0.66
left = (w - cw) // 2
crop = src.crop((left, 0, left + cw, h))
crop = crop.resize((600, int(600 * h / cw)), Image.LANCZOS)
crop.save(os.path.join(A, "sky-m.webp"), "WEBP", quality=74, method=6)
print("sky-m.webp", crop.size, round(os.path.getsize(os.path.join(A, "sky-m.webp")) / 1024, 1), "KB")

# 掌机：手机上显示约 320 宽，出 640 宽足够
pad = Image.open(os.path.join(A, "pad.png")).convert("RGBA")
pad = pad.resize((640, int(640 * pad.height / pad.width)), Image.LANCZOS)
pad.save(os.path.join(A, "pad-m.webp"), "WEBP", quality=86, method=6)
print("pad-m.webp", pad.size, round(os.path.getsize(os.path.join(A, "pad-m.webp")) / 1024, 1), "KB")

total = 0
for f in ["sky-m.webp", "pad-m.webp"] + [f"cover-{i}.webp" for i in range(1, 7)]:
    total += os.path.getsize(os.path.join(A, f))
print("mobile first-load assets:", round(total / 1024, 1), "KB")
