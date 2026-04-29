import requests

# Test 1 — through backend route
r = requests.post("http://localhost:5001/api/alerts/test-notification")
print("Backend route:", r.status_code, r.text)

# Test 2 — directly to ntfy (bypasses backend completely)
r2 = requests.post(
    "https://ntfy.sh/honeypot-observer-alerts",
    data="Direct test from Python — ntfy working?",
    headers={"Title": "Direct Test", "Priority": "urgent"}
)
print("Direct ntfy:", r2.status_code, r2.text)