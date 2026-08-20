"""Generate the OneFlow dossier cover."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "assets" / "diagrams" / "cover.png"


def fnt(size, bold=False):
    name = "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()


def main():
    w, h = 2480, 3508
    img = Image.new("RGB", (w, h), (7, 11, 20))
    d = ImageDraw.Draw(img)
    d.ellipse((900, -200, 2800, 1200), fill=(8, 47, 73))
    d.ellipse((-400, 2400, 1100, 3900), fill=(15, 23, 42))
    d.rectangle((0, 0, 18, h), fill=(34, 211, 238))
    d.text((160, 420), "PPG AEN HACKATHON 2026", font=fnt(42, True), fill=(103, 232, 249))
    d.text((160, 520), "CHALLENGE 4", font=fnt(36), fill=(165, 243, 252))
    d.text((160, 780), "OneFlow", font=fnt(160, True), fill=(255, 255, 255))
    d.text((160, 1000), "Connected Employee Lifecycle", font=fnt(52), fill=(186, 230, 253))
    d.rectangle((160, 1120, 420, 1126), fill=(34, 211, 238))
    d.text(
        (160, 1180),
        "A connected employee journey for onboarding, offboarding\nand cross-functional workplace administration.",
        font=fnt(36),
        fill=(203, 213, 225),
    )
    d.text((160, 1480), "Solution proposal  ·  Prototype evidence  ·  User guide", font=fnt(28), fill=(125, 211, 252))
    d.text((160, 2680), "Prepared by Team Error 404", font=fnt(32, True), fill=(255, 255, 255))
    d.text(
        (160, 2750),
        "Thamotharan, Renuka Malar\nRamachandran, Yuganeswary\nHairul Afizee\nBashari, Noorliana",
        font=fnt(28),
        fill=(203, 213, 225),
    )
    d.text((160, 3120), "Official demonstration", font=fnt(22), fill=(148, 163, 184))
    d.text((160, 3165), "https://oneflow.highrulez.com", font=fnt(30, True), fill=(103, 232, 249))
    d.text((160, 3280), "Hackathon prototype  ·  Synthetic data only  ·  August 2026", font=fnt(22), fill=(100, 116, 139))
    img.save(OUT, "PNG")
    print("saved", OUT)


if __name__ == "__main__":
    main()
