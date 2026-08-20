"""Capture OneFlow demo screenshots from the public site."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE = "https://oneflow.highrulez.com"
OUT = Path(__file__).resolve().parents[1] / "assets" / "screenshots"
PASSWORD = "Demo123!"
SAFE_DESTINATION = "approved-test-mailbox@example.com"


def skip_intro(page: Page) -> None:
    page.add_init_script(
        """
        try { sessionStorage.setItem('oneflow-hackathon-intro-seen-v1', '1'); } catch (e) {}
        """
    )


def shot(page: Page, name: str, wait: str | None = None, full: bool = False, pause: int = 900) -> None:
    if wait:
        page.wait_for_selector(wait, timeout=25000)
    page.wait_for_timeout(pause)
    page.screenshot(path=str(OUT / name), full_page=full, animations="disabled")
    print(f"saved {name}")


def login(page: Page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.wait_for_selector("#login-email", timeout=20000)
    page.fill("#login-email", email)
    page.fill("#login-password", PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url("**/oneflow**", timeout=25000)
    page.wait_for_timeout(1200)


def logout(page: Page) -> None:
    page.locator("button", has_text="Logout").first.click()
    page.wait_for_url("**/login**", timeout=20000)
    page.wait_for_timeout(400)


def mask_email_destinations(page: Page) -> None:
    page.evaluate(
        """(safe) => {
            const labels = Array.from(document.querySelectorAll('label'));
            labels.forEach((label) => {
                const input = label.querySelector('input');
                const simulated = label.querySelector('span');
                if (!input || !simulated) return;
                if ((simulated.textContent || '').includes('@ppg-demo.com')) {
                    input.value = safe;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }""",
        SAFE_DESTINATION,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1600, "height": 1100},
            device_scale_factor=1.5,
            locale="en-US",
        )
        page = context.new_page()
        skip_intro(page)

        # 01 hub
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(800)
        skip = page.locator("button", has_text="Skip Intro")
        if skip.count() and skip.first.is_visible():
            skip.first.click()
            page.wait_for_timeout(400)
        page.evaluate("window.scrollTo(0, 0)")
        shot(page, "01-project-hub.png", wait="text=OneFlow", pause=700)

        # 02 login
        page.goto(f"{BASE}/login", wait_until="networkidle")
        page.wait_for_selector("text=Employee Journeys", timeout=20000)
        page.set_viewport_size({"width": 1600, "height": 1280})
        shot(page, "02-login.png", wait="text=Demo Accounts", full=False, pause=700)
        page.set_viewport_size({"width": 1600, "height": 1100})

        # 03 admin dashboard
        login(page, "admin@ppg-demo.com")
        page.goto(f"{BASE}/oneflow", wait_until="networkidle")
        page.wait_for_selector("text=Preboarding", timeout=20000)
        page.wait_for_timeout(800)
        shot(page, "03-admin-dashboard.png", wait="text=Needs Attention")

        # 04 workday
        page.goto(f"{BASE}/workday", wait_until="networkidle")
        page.wait_for_selector("text=Workers", timeout=20000)
        shot(page, "04-workday.png", wait="text=Aziz, Nabila")

        # 05 lifecycle cases
        page.goto(f"{BASE}/oneflow/lifecycle-cases", wait_until="networkidle")
        page.wait_for_selector("text=Day 1 Readiness", timeout=20000)
        shot(page, "05-lifecycle-cases.png", wait="text=Exit Clearance")

        logout(page)

        # 06 IT Security dashboard
        login(page, "amirul.azli@ppg-demo.com")
        page.goto(f"{BASE}/oneflow", wait_until="networkidle")
        page.wait_for_selector("text=IT Security Dashboard", timeout=20000)
        shot(page, "06-role-dashboard-it-security.png", wait="text=Current Employee Journeys")

        # 07 my tasks (role-based)
        page.goto(f"{BASE}/oneflow/my-tasks", wait_until="networkidle")
        page.wait_for_selector("text=My Tasks", timeout=20000)
        page.wait_for_timeout(600)
        if page.locator("button", has_text="All Tasks").count():
            pass
        page.locator("button", has_text="Team Queue").click()
        page.wait_for_timeout(500)
        shot(page, "07-my-tasks.png", wait="text=Responsible")

        logout(page)

        # 08-11 Nabila
        login(page, "nabila.aziz@ppg-demo.com")
        page.goto(f"{BASE}/oneflow/my-onboarding", wait_until="networkidle")
        page.wait_for_selector("text=Day 1 Readiness", timeout=20000)
        shot(page, "08-nabila-onboarding.png", wait="text=Next Action")

        page.goto(f"{BASE}/oneflow/my-forms", wait_until="networkidle")
        page.wait_for_selector("text=My Forms", timeout=20000)
        shot(page, "09-nabila-forms.png", wait="text=Induction")

        page.goto(f"{BASE}/oneflow/inbox", wait_until="networkidle")
        page.wait_for_selector("text=Inbox", timeout=20000)
        shot(page, "10-nabila-inbox.png")

        page.goto(f"{BASE}/oneflow/my-profile", wait_until="networkidle")
        page.wait_for_selector("text=My Profile", timeout=20000)
        shot(page, "11-nabila-profile.png", wait="text=Aziz, Nabila")

        logout(page)

        # 12 Hamdan
        login(page, "muhamad.asyraf.hamdan@ppg-demo.com")
        page.goto(f"{BASE}/oneflow/my-offboarding", wait_until="networkidle")
        page.wait_for_selector("text=Exit Clearance", timeout=20000)
        shot(page, "12-hamdan-offboarding.png", wait="text=Your Offboarding Journey")

        logout(page)

        # Admin remaining
        login(page, "admin@ppg-demo.com")
        page.goto(f"{BASE}/oneflow/reports", wait_until="networkidle")
        page.wait_for_selector("text=Reports", timeout=20000)
        shot(page, "13-reports.png", wait="text=Lifecycle readiness")

        page.goto(f"{BASE}/oneflow/automation-runs", wait_until="networkidle")
        page.wait_for_selector("text=Automation", timeout=20000)
        shot(page, "14-automation.png")

        page.goto(f"{BASE}/oneflow/settings", wait_until="networkidle")
        page.wait_for_selector("text=Settings", timeout=20000)
        shot(page, "15-settings.png", wait="text=Email Delivery")

        page.goto(f"{BASE}/oneflow/email-delivery", wait_until="networkidle")
        page.wait_for_selector("text=Delivery configuration", timeout=20000)
        page.wait_for_timeout(800)
        mask_email_destinations(page)
        page.evaluate("window.scrollTo(0, 0)")
        shot(page, "16-email-delivery.png", wait="text=Credentials configured")

        page.locator("text=Recipient mappings").scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        mask_email_destinations(page)
        mappings = page.locator("section").filter(has_text="Recipient mappings")
        mappings.screenshot(path=str(OUT / "17-recipient-mapping.png"))
        print("saved 17-recipient-mapping.png")

        send = page.locator("section").filter(has_text="Send Test Email")
        send.scroll_into_view_if_needed()
        page.select_option("select", "nabila.aziz@ppg-demo.com")
        page.locator("button", has_text="Send Test Email").click()
        page.wait_for_timeout(2500)
        send = page.locator("section").filter(has_text="Send Test Email")
        send.screenshot(path=str(OUT / "18-send-test-email.png"))
        print("saved 18-send-test-email.png")

        # Wider capture of send result including banner if present
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / "18-send-test-email.png"), full_page=False)

        browser.close()


if __name__ == "__main__":
    main()
