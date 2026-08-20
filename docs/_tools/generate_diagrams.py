"""Generate architecture and collaboration diagrams for the OneFlow dossier."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "assets" / "diagrams"
NAVY = (15, 23, 42)
INK = (30, 41, 59)
MUTED = (71, 85, 105)
LINE = (148, 163, 184)
CYAN = (14, 116, 144)
SKY = (224, 242, 254)
WHITE = (255, 255, 255)
CARD = (248, 250, 252)
ACCENT = (8, 145, 178)
VIOLET = (91, 33, 182)
LIGHT_VIOLET = (245, 243, 255)
AMBER = (254, 243, 199)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = [
        "C:/Windows/Fonts/segoeui.ttf" if not bold else "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/calibri.ttf" if not bold else "C:/Windows/Fonts/calibrib.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, xy, fill, outline=None, radius=16, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def center_text(draw, xy, text, fnt, fill=INK):
    x1, y1, x2, y2 = xy
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((x1 + x2 - tw) / 2, (y1 + y2 - th) / 2 - 1), text, font=fnt, fill=fill)


def arrow(draw, x1, y, x2):
    draw.line((x1, y, x2 - 10, y), fill=ACCENT, width=3)
    draw.polygon([(x2, y), (x2 - 12, y - 6), (x2 - 12, y + 6)], fill=ACCENT)


def node(draw, xy, title, subtitle=None, fill=SKY, outline=ACCENT, title_fill=NAVY):
    rounded(draw, xy, fill=fill, outline=outline, radius=18, width=2)
    x1, y1, x2, y2 = xy
    f_title = font(20, True)
    if subtitle:
        center_text(draw, (x1, y1 + 8, x2, y1 + 40), title, f_title, title_fill)
        center_text(draw, (x1, y1 + 34, x2, y2 - 8), subtitle, font(13), MUTED)
    else:
        center_text(draw, xy, title, f_title, title_fill)


def prototype():
    img = Image.new("RGB", (1600, 720), WHITE)
    draw = ImageDraw.Draw(img)
    draw.text((64, 36), "OneFlow — current prototype architecture", font=font(28, True), fill=NAVY)
    draw.text(
        (64, 78),
        "Hackathon demonstration only. This is not a production deployment blueprint.",
        font=font(16),
        fill=MUTED,
    )
    boxes = [
        (70, 280, 310, 400, "Browser", "Judge / demo user"),
        (390, 280, 680, 400, "OneFlow + Workday mock", "Lifecycle experience layer"),
        (760, 280, 1040, 400, "Next.js application", "DataService / prototype store"),
        (1120, 160, 1520, 280, "Prototype persistence", "Local / container storage"),
        (1120, 400, 1520, 520, "Simulation + optional SES", "Mock inbox and test email"),
    ]
    for x1, y1, x2, y2, t, s in boxes:
        node(draw, (x1, y1, x2, y2), t, s)
    arrow(draw, 310, 340, 390)
    arrow(draw, 680, 340, 760)
    draw.line((1040, 340, 1080, 340), fill=ACCENT, width=3)
    draw.line((1080, 220, 1080, 460), fill=ACCENT, width=3)
    arrow(draw, 1080, 220, 1120)
    arrow(draw, 1080, 460, 1120)
    draw.text((64, 640), "Current prototype architecture — not production", font=font(14), fill=LINE)
    img.save(OUT / "prototype-architecture.png", "PNG")


def production():
    img = Image.new("RGB", (1680, 980), WHITE)
    draw = ImageDraw.Draw(img)
    draw.text((64, 28), "OneFlow — proposed Microsoft-first production architecture", font=font(28, True), fill=NAVY)
    draw.text(
        (64, 70),
        "Proposed direction only. These production integrations are not implemented in the hackathon prototype.",
        font=font(16),
        fill=MUTED,
    )

    node(draw, (70, 140, 340, 250), "Microsoft Entra ID", "Identity, SSO and RBAC")
    node(draw, (400, 140, 720, 250), "Azure Key Vault", "Secrets and certificates")
    node(draw, (780, 140, 1180, 250), "Azure Monitor / App Insights", "Observability and audit")

    node(draw, (70, 340, 300, 460), "Workday", "Approved HR source")
    node(draw, (380, 340, 640, 460), "Integration / API", "Governed Workday events")
    node(draw, (720, 340, 980, 460), "Dataverse", "Lifecycle case data")
    node(draw, (1060, 340, 1360, 460), "Power Automate", "Workflow orchestration")

    node(draw, (720, 560, 980, 680), "OneFlow", "Employee lifecycle UX")
    node(draw, (1060, 560, 1400, 680), "Microsoft 365", "Outlook / Teams")
    node(draw, (720, 780, 980, 900), "Power BI", "Operational reporting")

    arrow(draw, 300, 400, 380)
    arrow(draw, 640, 400, 720)
    arrow(draw, 980, 400, 1060)
    draw.line((850, 460, 850, 560), fill=ACCENT, width=3)
    draw.line((1210, 460, 1210, 560), fill=ACCENT, width=3)
    arrow(draw, 980, 620, 1060)
    draw.line((850, 680, 850, 780), fill=ACCENT, width=3)
    draw.line((205, 250, 205, 340), fill=ACCENT, width=3)
    draw.line((205, 295, 850, 295), fill=LINE, width=1)
    draw.line((850, 250, 850, 340), fill=ACCENT, width=3)

    draw.text((64, 930), "Proposed production architecture — not implemented", font=font(14), fill=LINE)
    img.save(OUT / "proposed-production-architecture.png", "PNG")


def collaboration():
    img = Image.new("RGB", (1700, 980), WHITE)
    draw = ImageDraw.Draw(img)
    draw.text((56, 28), "OneFlow as a shared orchestration layer", font=font(28, True), fill=NAVY)
    draw.text(
        (56, 70),
        "Challenge 4 asks for collaboration among HR, IT, payroll, facilities, managers and employees. OneFlow coordinates owned work around one employee journey.",
        font=font(16),
        fill=MUTED,
    )

    node(draw, (620, 130, 1080, 250), "OneFlow lifecycle case", "Shared onboarding / offboarding journey")

    roles = [
        (60, 340, "HR", "Milestones, forms, readiness"),
        (360, 340, "Hiring Manager", "Transition and new-hire actions"),
        (660, 340, "IT Security", "Access create / remove"),
        (960, 340, "Onsite IT", "Equipment and local setup"),
        (1260, 340, "Facilities", "Workplace access / return"),
        (60, 560, "Finance", "Operational / finance checks"),
        (360, 560, "Corporate Card", "Card setup and recovery"),
        (660, 560, "Quality", "Specialist clearance"),
        (960, 560, "Product Stewardship", "Specialist clearance"),
        (1260, 560, "Employee", "Journey, forms, inbox"),
    ]
    for x, y, title, sub in roles:
        node(draw, (x, y, x + 260, y + 120), title, sub, fill=CARD, outline=(186, 230, 253))
        draw.line((x + 130, y, 850, 250), fill=(186, 230, 253), width=2)

    draw.rounded_rectangle((56, 740, 1644, 920), radius=18, fill=LIGHT_VIOLET, outline=(196, 181, 253), width=2)
    draw.text((80, 760), "Challenge 4 mapping", font=font(18, True), fill=VIOLET)
    draw.text(
        (80, 798),
        "HR, IT, facilities, managers and employees are represented in the current prototype.",
        font=font(16),
        fill=INK,
    )
    draw.text(
        (80, 832),
        "Finance is the closest implemented operational counterpart to payroll. Payroll-specific calculation, payslip and statutory processing remain future production scope.",
        font=font(16),
        fill=INK,
    )
    draw.text(
        (80, 866),
        "Corporate Card, Quality and Product Stewardship are included because they own real clearance and setup work in the prototype journeys.",
        font=font(16),
        fill=INK,
    )
    img.save(OUT / "role-collaboration.png", "PNG")


def lifecycle():
    img = Image.new("RGB", (1680, 780), WHITE)
    draw = ImageDraw.Draw(img)
    draw.text((56, 32), "Connected employee lifecycle — how OneFlow works", font=font(28, True), fill=NAVY)
    draw.text((56, 74), "Workday remains the HR source. OneFlow turns a lifecycle event into owned work, employee action and readiness or clearance.", font=font(16), fill=MUTED)

    steps = [
        ("1", "Lifecycle event", "Hire / exit in Workday"),
        ("2", "OneFlow case", "Onboarding or offboarding"),
        ("3", "Role work", "Owned tasks by team"),
        ("4", "Employee journey", "Forms, inbox, next action"),
        ("5", "Visibility", "Dashboards and reports"),
        ("6", "Outcome", "Day 1 Readiness / Exit Clearance"),
    ]
    for i, (num, title, sub) in enumerate(steps):
        x = 56 + i * 270
        node(draw, (x, 220, x + 240, 380), title, sub)
        draw.ellipse((x + 96, 160, x + 144, 208), fill=ACCENT)
        center_text(draw, (x + 96, 160, x + 144, 208), num, font(20, True), WHITE)
        if i < len(steps) - 1:
            arrow(draw, x + 240, 300, x + 270)

    draw.rounded_rectangle((56, 460, 1624, 700), radius=18, fill=SKY, outline=ACCENT, width=2)
    draw.text((80, 488), "Prototype vs production", font=font(18, True), fill=NAVY)
    draw.text((80, 534), "Prototype: Workday mock, demo accounts, simulated automation, mock inbox, optional AWS SES test delivery.", font=font(16), fill=INK)
    draw.text((80, 574), "Production: approved Workday APIs, Microsoft Entra ID, Dataverse, Power Automate, Microsoft 365, Power BI, Key Vault and Azure Monitor.", font=font(16), fill=INK)
    draw.text((80, 614), "The prototype validates the operating model. A production pilot would validate measurable business impact.", font=font(16), fill=INK)
    img.save(OUT / "lifecycle-flow.png", "PNG")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    prototype()
    production()
    collaboration()
    lifecycle()
    print("diagrams written to", OUT)


if __name__ == "__main__":
    main()
