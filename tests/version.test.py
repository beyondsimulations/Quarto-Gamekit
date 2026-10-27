"""game.lua's VERSION names the site_libs folder (gamekit-<version>). It must
follow _extension.yml, or browsers and caches keep serving the old files.

    python3 tests/version.test.py
"""
import re
from pathlib import Path

ext = Path(__file__).resolve().parent.parent / "_extensions" / "gamekit"
want = re.search(r"^version:\s*(\S+)", (ext / "_extension.yml").read_text(), re.M).group(1)
got = re.search(r'^local VERSION = "([^"]+)"', (ext / "game.lua").read_text(), re.M).group(1)
assert got == want, f"game.lua VERSION {got} != _extension.yml {want}"
print(f"ok: {got}")
