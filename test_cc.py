from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream"
            ]
        )
        page = browser.new_page()
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        
        try:
            page.goto("http://localhost:5173/room/123", timeout=10000)
            print("Loaded page...")
            time.sleep(1) # Let React mount
            
            # If there's a join button, we might need to click it. Usually not for local.
            print("Clicking CC...")
            page.evaluate("() => document.querySelector('button[title=\"Turn on Captions\"]').click()")
            print("Clicked CC")
            time.sleep(5)
        except Exception as e:
            print(f"Failed: {e}")
            
        browser.close()

if __name__ == "__main__":
    run()
