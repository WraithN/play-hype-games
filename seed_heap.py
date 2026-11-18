import json, os, shutil

ROOT = r"D:\拓墟造界核心业务\游戏独立站\playhypegames"
DESIGN = os.path.join(ROOT, "design", "assets")
PUB = os.path.join(ROOT, "public", "assets")
os.makedirs(PUB, exist_ok=True)

for f in ["sky.webp", "pad.webp"] + [f"cover-{i}.webp" for i in range(1, 7)]:
    shutil.copy2(os.path.join(DESIGN, f), os.path.join(PUB, f))
print("copied:", len(os.listdir(PUB)), "files")

# 给游戏数据补 heat 字段，并按标题把 6 张封面挂上去
gf = os.path.join(ROOT, "data", "games.json")
games = json.load(open(gf, encoding="utf-8"))

covers = {
    "Super Idle Farm": "cover-1.webp",
    "Slime IO 2": "cover-2.webp",
    "Cookie Kingdom": "cover-3.webp",
    "Miner Tycoon": "cover-4.webp",
    "Robot Battle X": "cover-5.webp",
    "Racing Go": "cover-6.webp",
}

heat_base = 982
for i, g in enumerate(games):
    if "heat" not in g:
        g["heat"] = max(60, heat_base - i * 55)
    if not g.get("thumb") and g.get("title") in covers:
        g["thumb"] = "/assets/" + covers[g["title"]]

json.dump(games, open(gf, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("games updated:", len(games))
for g in games[:6]:
    print(" ", g["id"], g["title"], "heat=", g["heat"], "thumb=", bool(g["thumb"]))
