import subprocess, sys, json, os

CLI = r"C:\Users\nathon.wang\AppData\Local\Doubao\User Data\Default\sandbox_envs_dir\envs\936e492d-6ba7-4d32-b204-e33e910ba05f\override_dlcs\design-cli.exe"
WS = "cws_62198454548551682"

XML = """<item type="HTML" path="/deliverables/play-hype-games" title="Play Hype Games 首页" brief="PLAY HYPE GAMES 海内外浏览器游戏聚合站首页 HTML 源，1440x1300，含云海背景层、透明掌机层、HTML 文案层与数据驱动的游戏卡片区（按热度排序，可按分类切换，无封面自动降级）">
  <size width="1440" height="1300"/>
  <asset url="https://aka.doubaocdn.com/s/oD5BHKCyxF"/>
</item>
"""

p = subprocess.run(
    [CLI, "design-workspace", "+create", "--canvas-workspace-id", WS, "--input", "-"],
    input=XML.encode("utf-8"),
    capture_output=True,
)
print("EXIT", p.returncode)
print("STDOUT", p.stdout.decode("utf-8", "replace")[:4000])
print("STDERR", p.stderr.decode("utf-8", "replace")[:2000])
