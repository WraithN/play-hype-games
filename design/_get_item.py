import subprocess

CLI = r"C:\Users\nathon.wang\AppData\Local\Doubao\User Data\Default\sandbox_envs_dir\envs\936e492d-6ba7-4d32-b204-e33e910ba05f\override_dlcs\design-cli.exe"
WS = "cws_62198454548551682"
ITEM = "NnLmjrdf-4anUCiIYmg-0201"

p = subprocess.run(
    [CLI, "design-workspace", "+get", "--canvas-workspace-id", WS, "--item-ids", ITEM],
    capture_output=True,
)
print("EXIT", p.returncode)
print("STDOUT", p.stdout.decode("utf-8", "replace")[:4000])
print("STDERR", p.stderr.decode("utf-8", "replace")[:2000])
