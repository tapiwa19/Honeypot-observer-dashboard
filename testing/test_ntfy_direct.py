# test_ntfy_direct.py
import requests

TOPIC = "honeypot-observer-alerts"   # change to your exact topic name

response = requests.post(
    f"https://ntfy.sh/{TOPIC}",
    data="Test from Honeypot Observer — if you see this ntfy works!",
    headers={"Title": "Honeypot Test Alert", "Priority": "urgent"}
)
print("Status:", response.status_code)
print("If you got a phone notification — ntfy is working!")