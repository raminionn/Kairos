"""Download the fonts the default brand uses into kairos_carousel/fonts (run once; needs internet)."""
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
FILES = {
    "Inter.ttf": "inter/Inter%5Bopsz%2Cwght%5D.ttf",
    "PlayfairDisplay.ttf": "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    "Poppins-Regular.ttf": "poppins/Poppins-Regular.ttf",
    "Poppins-Medium.ttf": "poppins/Poppins-Medium.ttf",
    "Poppins-SemiBold.ttf": "poppins/Poppins-SemiBold.ttf",
}
dest = Path(__file__).parent / "kairos_carousel" / "fonts"
dest.mkdir(parents=True, exist_ok=True)
for name, path in FILES.items():
    target = dest / name
    if target.exists():
        print("have", name)
        continue
    print("downloading", name)
    urllib.request.urlretrieve(BASE + path, target)
print("done")
