import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\sushant\.gemini\antigravity\brain\14f41a14-bb2e-4301-9809-50eb9ed02265\screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})

        # ---------------------------------------------------------
        # 1. TEACHER: Login & Start Attendance Session
        # ---------------------------------------------------------
        page_teacher = context.new_page()
        page_teacher.goto("http://127.0.0.1:5173/login")
        page_teacher.wait_for_selector("input")

        # Fill teacher login
        inputs = page_teacher.query_selector_all("input")
        inputs[0].fill("teacher1")
        inputs[1].fill("teacher123")
        page_teacher.click("button[type='submit']")

        page_teacher.wait_for_url("**/teacher/dashboard", timeout=10000)
        time.sleep(1)

        # Navigate to start attendance
        page_teacher.goto("http://127.0.0.1:5173/teacher/start-attendance")
        page_teacher.wait_for_selector("h1")
        time.sleep(1)

        # Check if an active session already exists, if so stop it first to start clean
        stop_btn = page_teacher.query_selector("button:has-text('Stop Attendance')")
        if stop_btn:
            stop_btn.click()
            time.sleep(1)
            confirm_btn = page_teacher.query_selector("button:has-text('Stop Session')")
            if confirm_btn:
                confirm_btn.click()
                time.sleep(2)

        start_btn = page_teacher.wait_for_selector("button:has-text('START ATTENDANCE SESSION'), button:has-text('Stop Attendance')")
        if "START ATTENDANCE SESSION" in start_btn.inner_text():
            start_btn.click()
            time.sleep(2)

        page_teacher.screenshot(path=os.path.join(SCREENSHOT_DIR, "ble_01_teacher_session_active.png"))
        print("[OK] Teacher active session started and screenshot saved.")

        # ---------------------------------------------------------
        # 2. STUDENT: Login, Scan BLE & Mark Attendance
        # ---------------------------------------------------------
        context_student = browser.new_context(viewport={"width": 1280, "height": 800})
        page_student = context_student.new_page()
        page_student.goto("http://127.0.0.1:5173/login")
        page_student.wait_for_selector("input")

        s_inputs = page_student.query_selector_all("input")
        s_inputs[0].fill("student1")
        s_inputs[1].fill("student123")
        page_student.click("button[type='submit']")

        page_student.wait_for_url("**/student/dashboard", timeout=10000)
        time.sleep(1)

        # Navigate to mark attendance
        page_student.goto("http://127.0.0.1:5173/student/mark-attendance")
        page_student.wait_for_selector("h1")
        time.sleep(2)

        page_student.screenshot(path=os.path.join(SCREENSHOT_DIR, "ble_02_student_radar_scanning.png"))
        print("[OK] Student BLE scanning screen captured.")

        # Click Mark Attendance
        mark_btn = page_student.query_selector("button:has-text('Mark Attendance'), button:has-text('Verify Presence')")
        if mark_btn:
            mark_btn.click()
            time.sleep(3)
            page_student.screenshot(path=os.path.join(SCREENSHOT_DIR, "ble_03_student_attendance_marked.png"))
            print("[OK] Student attendance marked successfully.")

        # ---------------------------------------------------------
        # 3. STUDENT: Attendance History Verification
        # ---------------------------------------------------------
        page_student.goto("http://127.0.0.1:5173/student/history")
        page_student.wait_for_selector("table")
        time.sleep(1)

        page_student.screenshot(path=os.path.join(SCREENSHOT_DIR, "ble_04_student_attendance_history.png"))
        print("[OK] Student Attendance History table captured.")

        # ---------------------------------------------------------
        # 4. TEACHER: Live Attendance Roster
        # ---------------------------------------------------------
        page_teacher.goto("http://127.0.0.1:5173/teacher/live-attendance")
        page_teacher.wait_for_selector("h1")
        time.sleep(2)

        page_teacher.screenshot(path=os.path.join(SCREENSHOT_DIR, "ble_05_teacher_live_roster.png"))
        print("[OK] Teacher Live Attendance Roster captured.")

        browser.close()

if __name__ == "__main__":
    run()
