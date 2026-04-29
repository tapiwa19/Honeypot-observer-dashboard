# test_ntfy_simple.py
import requests

# Replace with YOUR exact topic from the phone app
TOPIC = "honeypot-observer-alerts"

try:
    r = requests.post(
        f"https://ntfy.sh/{TOPIC}",
        data="Hello from Honeypot Observer",
    )
    print(f"Status code : {r.status_code}")
    print(f"Response    : {r.text}")
    if r.status_code == 200:
        print("✅ Sent! Check your phone")
    else:
        print("❌ Failed — check topic name")
except Exception as e:
    print(f"❌ Error: {e}")